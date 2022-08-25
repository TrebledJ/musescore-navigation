.import "../nav-utils.js" as Utils
.import MuseScore 3.0 as MS


function History(loadValue, saveValue, onInfo, onError) {
    // Settings.
    this.collateMeasureThreshold = 1;
    this.collateStaffIdxThreshold = 1;
    this.maxRecords = 40;
    // this.allowedElements = [Element.CHORD, Element.REST, Element.NOTE];
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
    this.load();
}

/**
 * @brief   Perform checks to see if other plugin actions modified the records list
 *          and update the records here accordingly.
 */
History.prototype.checkCrossUpdate = function () {
    // Copy old records.
    var old_bk = this.records_bk;
    var old_fw = this.records_fw;
    this.load();
    var new_bk = this.records_bk;
    var new_fw = this.records_fw;
    console.log("old -- bk: %1 elements,  fw: %2 elements".arg(old_bk.length).arg(old_fw.length));
    console.log("new -- bk: %1 elements,  fw: %2 elements".arg(new_bk.length).arg(new_fw.length));
    if (Math.abs(old_bk.length - new_bk.length) === 1 && Math.abs(old_fw.length - new_fw.length) === 1) {
        // Both stacks differ by 1, they must've been updated by another plugin.
        console.log("differ by 1 -- update by another plugin");
        this.ignore_next_select = true;
    }
}

History.prototype.logPosition = function () {
    if (this.ignore_next_select) {
        console.log("ignoring select");
        this.ignore_next_select = false;
        return;
    }

    var record = this.getRecord();
    if (!record)
        return;

    console.log(JSON.stringify(record));
    this.collateAndPush(record);
    this.save();
}

History.prototype.getRecord = function () {
    var cursor = Utils.getCursorAtSelection(this.allowedElements, null, this.segmentFilter);
    if (!cursor) {
        console.log("nothing selected");
        return null;
    }

    // TODO: track score also.
    return {
        staffIdx: cursor.staffIdx,
        measure: Utils.getCursorMeasureNumber(cursor),
        part: cursor.element.staff.part.partName,
    };
}

History.prototype.collateAndPush = function (curr) {
    var prev = this.records_bk ? this.records_bk[this.records_bk.length - 1] : null;
    var collate = false;
    if (this.records_bk.length > 0) {
        collate = this.shouldCollate(curr, prev);
    }

    console.log("collate? %1".arg(collate));
    console.log("curr: %1  /  prev: %2".arg(JSON.stringify(curr)).arg(JSON.stringify(prev)));

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
        //     console.log("pushing prev record");
        //     this.push(this.prevRecord);
        // }

        // if (this.records_bk.length === 0) {
        //     console.log("pushing curr");
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
    console.log("last %1 records:".arg(n));
    for (var i = Math.max(this.records_bk.length - n, 0); i < this.records_bk.length; i++) {
        console.log(" [%1]: m: %2 / s: %3 / p: %4".arg(i).arg(this.records_bk[i].measure).arg(this.records_bk[i].staffIdx).arg(this.records_bk[i].part));
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
    console.log("saving: %1 back-records,  %2 fwd-records".arg(this.records_bk.length).arg(this.records_fw.length));
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
    console.log("loaded: %1 back-records,  %2 fwd-records".arg(this.records_bk.length).arg(this.records_fw.length));
}

function getCursorAtRecord(rec) {
    var cursor = curScore.newCursor();
    cursor.rewind(MS.Cursor.SCORE_START);
    for (var i = 0; i < rec.measure - 1; cursor.nextMeasure(), i++);
    cursor.staffIdx = rec.staffIdx;
    return cursor;
}
