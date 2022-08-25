.import "../nav-utils.js" as Utils
.import MuseScore 3.0 as MS


function History(loadValue, saveValue, onInfo, onError, label) {
    // Settings.
    this.collateMeasureThreshold = 1;
    this.collateStaffIdxThreshold = 1;
    this.maxRecords = 40;
    this.allowedElements = null; // Allow any.
    this.segmentFilter = Segment.All;

    // Private.
    // We'll keep the history in two stacks: a back-stack and a forward-stack.
    // When going back, a record is transferred from the back stack to the forward stack.
    // Similarly when going forward, the record is transferred the other way.
    this.records_bk = [];
    this.records_fw = [];
    // this.prevRecord = null;
    this.loadSaveKey = "plugin.history.records";
    this.loadValue = loadValue || function () {};
    this.saveValue = saveValue || function () {};
    this.onInfo = onInfo || console.log;
    this.onError = onError || console.error;
    this.log = function (x) { console.log("[%1]:".arg(label), x); };
    this.load();
}

History.prototype.logPosition = function (checkCrossUpdate) {
    if (this.ignore_next_select) {
        this.log("ignoring select");
        this.ignore_next_select = false;
        return;
    }

    var record = this.getRecord();
    if (!record)
        return;

    this.log("got record: %1".arg(JSON.stringify(record)));

    if (checkCrossUpdate) {
        // Perform checks to see if other plugin actions were called.
        // We'll detect by cross-checking the new selection record with the records list here.
        var crossUpdate = false;
        if (this.records_bk.length >= 2 && isRecordEqual(this.records_bk[this.records_bk.length - 2], record)) {
            // Record is same as top of bk --> go-back action was called.
            this.log("detected go-back action was called")
            this.records_fw.push(this.records_bk.pop());
            crossUpdate = true;
        } else if (this.records_fw.length >= 1 && isRecordEqual(this.records_fw[this.records_fw.length - 1], record)) {
            // Record is same as top of fw --> go-forward action was called.
            this.log("detected go-forward action was called")
            this.records_bk.push(this.records_fw.pop());
            crossUpdate = true;
        }
        if (crossUpdate) {
            this.log("update: %1 back elements, %2 forward elements".arg(this.records_bk.length).arg(this.records_fw.length));
            return; // No need to push anythinng.
        }
    }

    this.collateAndPush(record);
    this.save();
}

History.prototype.getRecord = function () {
    var cursor = Utils.getCursorAtSelection(this.allowedElements, null, this.segmentFilter);
    if (!cursor) {
        this.log("nothing selected");
        return null;
    }

    // TODO: track score also.
    return {
        staffIdx: cursor.staffIdx,
        measure: Utils.getCursorMeasureNumber(cursor),
        // part: cursor.element.staff.part.partName,
    };
}

History.prototype.collateAndPush = function (curr) {
    var prev = this.records_bk ? this.records_bk[this.records_bk.length - 1] : null;
    var collate = false;
    if (this.records_bk.length > 0) {
        collate = this.shouldCollate(curr, prev);
    }

    this.log("collate? %1".arg(collate));
    this.log("curr: %1  /  prev: %2".arg(JSON.stringify(curr)).arg(JSON.stringify(prev)));

    // If collate, do nothing except update `prevRecord`.
    if (collate) {
        // Replace last record with current one.
        if (this.records_bk.length > 0) {
            this.records_bk[this.records_bk.length - 1] = curr;
        } else {
            this.push(curr);
        }
        // this.prevRecord = curr;
    } else {
        // if (this.records_bk.length > 0
        //     && !this.shouldCollate(this.records_bk[this.records_bk.length - 1], this.prevRecord)) {
        //     // `prevRecord` is far from the last pushed record.
        //     // Push `prevRecord` as well so that when the user goes back, 
        //     // it will return to their most recent selection.
        //     this.log("pushing prev record");
        //     this.push(this.prevRecord);
        // }

        // if (this.records_bk.length === 0) {
        //     this.log("pushing curr");
        //     this.push(curr);
        // }
        
        this.push(curr);
        // this.prevRecord = curr;
    }
    this.printLast(5);
}
// TODO: test without this.prevRecord
// TODO: test stable cross-plugin updates

History.prototype.push = function (rec) {
    this.records_bk.push(rec);
    while (this.records_bk.length > this.maxRecords) {
        this.records_bk.shift(); // Delete front.
    }
}

/**
 * @brief   Helper function for debugging, printing out recent records.
 */
History.prototype.printLast = function (n) {
    n = n || 5;
    this.log("last %1 records:".arg(n));
    for (var i = Math.max(this.records_bk.length - n, 0); i < this.records_bk.length; i++) {
        this.log(" [%1]: m: %2 / s: %3".arg(i).arg(this.records_bk[i].measure).arg(this.records_bk[i].staffIdx));
    }
}

/**
 * @brief   Clear all records.
 */
History.prototype.clear = function() {
    this.records_bk = [];
    this.records_fw = [];
    // this.prevRecord = null;
    this.save();
}

/**
 * @brief   Select the last back record and move it to the forward-stack.
 */
History.prototype.goBack = function () {
    // For records_bk, look 2 elements back, since the top-most element is the current position.
    this.goImpl(this.records_bk, 2, this.records_fw);
}

/**
 * @brief   Select the next forward record and move it to the back-stack.
 */
History.prototype.goForward = function () {
    this.goImpl(this.records_fw, 1, this.records_bk);
}

/**
 * @brief   Select the topmost element on a stack. Then pop it and push it to its mirror stack.
 */
History.prototype.goImpl = function (stack, n, mirror) {
    if (stack.length < n) {
        this.onError("No data to go to.");
        return;
    }

    var rec = stack[stack.length - n];
    var cursor = getCursorAtRecord(rec);

    var selectable = Utils.getSelectableAtStaff(cursor, rec.staffIdx);
    curScore.selection.select(selectable);

    mirror.push(stack.pop());
    this.ignore_next_select = true;
    this.save();
}

/**
 * @brief   Determine whether two records should be collated (counted as one).
 * @return  true if the records should be collated, false otherwise.
 */
History.prototype.shouldCollate = function (rec1, rec2) {
    if (Math.abs(rec1.measure - rec2.measure) <= this.collateMeasureThreshold
        && Math.abs(rec1.staffIdx - rec2.staffIdx) <= this.collateStaffIdxThreshold) {
        return true;
    }
    return false;
}

/**
 * @brief   Save records to somewhere.
 */
History.prototype.save = function () {
    this.log("saving: %1 back-records,  %2 fwd-records".arg(this.records_bk.length).arg(this.records_fw.length));
    this.saveValue('records_bk', this.records_bk);
    this.saveValue('records_fw', this.records_fw);
}

/**
 * @brief   Load records from somewhere.
 */
History.prototype.load = function () {
    this.records_bk = this.loadValue('records_bk');
    this.records_fw = this.loadValue('records_fw');
    // this.prevRecord = this.records_bk ? this.records_bk[this.records_bk.length - 1] : null;
    this.log("loaded: %1 back-records,  %2 fwd-records".arg(this.records_bk.length).arg(this.records_fw.length));
}

function getCursorAtRecord(rec) {
    var cursor = curScore.newCursor();
    cursor.rewind(MS.Cursor.SCORE_START);
    for (var i = 0; i < rec.measure - 1; cursor.nextMeasure(), i++);
    cursor.staffIdx = rec.staffIdx;
    return cursor;
}

function isRecordEqual(rec1, rec2) {
    return rec1.staffIdx === rec2.staffIdx
            && rec1.measure === rec2.measure
}
