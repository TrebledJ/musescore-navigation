.import "../nav-utils.js" as Utils
.import MuseScore 3.0 as MS


function History(onLoad, onSave, onInfo, onError) {
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
    this.prevRecord = null;
    this.loadSaveKey = "plugin.history.records";
    this.onLoad = onLoad || function () {};
    this.onSave = onSave || function () {};
    this.onInfo = onInfo || console.log;
    this.onError = onError || console.error;
    this.load();
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

    // TODO: track segment also.
    return {
        staffIdx: cursor.staffIdx,
        measure: Utils.getCursorMeasureNumber(cursor),
        part: cursor.element.staff.part.partName,
    };
}

History.prototype.collateAndPush = function (curr) {
    var collate = false;
    if (this.records_bk.length > 0) {
        collate = this.shouldCollate(curr, this.prevRecord);
    }

    // If collate, do nothing except update `prevRecord`.
    if (collate) {
        this.prevRecord = curr;
    } else {
        if (this.records_bk.length > 0
            && !this.shouldCollate(this.records_bk[this.records_bk.length - 1], this.prevRecord)) {
            // `prevRecord` is far from the last pushed record.
            // Push `prevRecord` as well so that when the user goes back, 
            // it will return to their most recent selection.
            this.push(this.prevRecord);
        }

        if (this.records_bk.length === 0) {
            this.push(curr);
        }
        
        // this.push(curr);
        this.prevRecord = curr;
        this.printLast(5);
    }
}

History.prototype.push = function (rec) {
    this.records_bk.push(rec);
    if (this.records_bk.length > this.maxRecords) {
        this.records_bk.shift(); // Delete front.
    }
}

History.prototype.printLast = function (n) {
    n = n || 5;
    console.log("last %1 records:".arg(n));
    for (var i = Math.max(this.records_bk.length - n, 0); i < this.records_bk.length; i++) {
        console.log(" [%1]: m: %2 / s: %3 / p: %4".arg(i).arg(this.records_bk[i].measure).arg(this.records_bk[i].staffIdx).arg(this.records_bk[i].part));
    }
}

History.prototype.clear = function() {
    this.records_bk = [];
    this.records_fw = [];
    this.save();
}

/**
 * @brief   Select the last back record and move it to the forward-stack.
 */
History.prototype.goBack = function () {
    this.goImpl(this.records_bk, this.records_fw);
}

/**
 * @brief   Select the next forward record and move it to the back-stack.
 */
History.prototype.goForward = function () {
    this.goImpl(this.records_fw, this.records_bk);
}

/**
 * @brief   Select the topmost element on a stack. Then pop it and push it to its mirror stack.
 */
History.prototype.goImpl = function (stack, mirror) {
    if (stack.length === 0) {
        this.onError("No data to go to.");
        return;
    }

    var rec = stack[stack.length - 1];
    var cursor = getCursorAtRecord(rec);

    var selectable = Utils.getSelectableAtStaff(cursor, rec.staffIdx);
    curScore.selection.select(selectable);

    mirror.push(stack.pop());
    this.ignore_next_select = true;
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
    this.onSave();
}

/**
 * @brief   Load records from somewhere.
 */
History.prototype.load = function () {
    this.onLoad();
}

function getCursorAtRecord(rec) {
    var cursor = curScore.newCursor();
    cursor.rewind(MS.Cursor.SCORE_START);
    for (var i = 0; i < rec.measure - 1; cursor.nextMeasure(), i++);
    cursor.staffIdx = rec.staffIdx;
    return cursor;
}
