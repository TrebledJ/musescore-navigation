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
    this.recordsBk = [];
    this.recordsFw = [];
    this.currRecord = null;
    this.loadValue = loadValue || function () {};
    this.saveValue = saveValue || function () {};
    this.onInfo = onInfo || console.log;
    this.onError = onError || console.error;
    this.log = function (x) { console.log("[%1]:".arg(label), x); };

    // Load existing history.
    this.load();
}

History.prototype.checkCrossUpdate = function (record) {
    var this_ = this;
    function check(stack, mirror) {
        if (stack.length >= 1 && isRecordEqual(stack[stack.length - 1], record)) {
            mirror.push(this_.currRecord);
            this_.currRecord = stack.pop();
            return true;
        }
        return false;
    }
    return check(this.recordsBk, this.recordsFw) || check(this.recordsFw, this.recordsBk);
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
        if (this.checkCrossUpdate(record)) {
            this.log("detected another history plugin was called...");
            // this.log("update: %1 back elements, %2 forward elements".arg(this.recordsBk.length).arg(this.recordsFw.length));
            this.save();
            return; // No need to push anythinng.
        }
    }

    this.collateAndPush(record);
    this.printLast(5);
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
    };
}

History.prototype.collateAndPush = function (newRecord) {
    if (!this.currRecord) {
        this.currRecord = newRecord;
        return;
    }
    var collate = this.shouldCollate(newRecord, this.currRecord);

    // If collate, do nothing except update `currRecord`.
    if (collate) {
        this.currRecord = newRecord;
    } else {
        if (this.recordsBk.length > 0
            && !this.shouldCollate(this.recordsBk[this.recordsBk.length - 1], this.currRecord)) {
            // `currRecord` is far enough from the last pushed record.
            this.push(this.currRecord);
        } else if (this.recordsBk.length === 0) {
            // Or eh, there are no records so just push it.
            this.push(this.currRecord);
        }

        this.currRecord = newRecord;
    }
}

History.prototype.push = function (rec) {
    this.recordsBk.push(rec);
    while (this.recordsBk.length > this.maxRecords) {
        this.recordsBk.shift(); // Delete front.
    }
}

/**
 * @brief   Helper function for debugging, printing out recent records.
 */
History.prototype.printLast = function (n) {
    n = n || 5;
    this.log("last %1 records:".arg(n));
    for (var i = Math.max(this.recordsBk.length - n + 1, 0); i < this.recordsBk.length; i++) {
        this.log(" [%1]: m: %2 / s: %3".arg(i).arg(this.recordsBk[i].measure).arg(this.recordsBk[i].staffIdx));
    }
    if (this.currRecord)
        this.log(" [*]: m: %1 / s: %2".arg(this.currRecord.measure).arg(this.currRecord.staffIdx));
    else
        this.log(" [*]: null");
}

/**
 * @brief   Clear all records.
 */
History.prototype.clear = function() {
    this.recordsBk = [];
    this.recordsFw = [];
    this.currRecord = null;
    this.save();
}

/**
 * @brief   Select the last back record and move it to the forward-stack.
 */
History.prototype.goBack = function () {
    // For recordsBk, look 2 elements back, since the top-most element is the current position.
    this.goImpl(this.recordsBk, this.recordsFw);
}

/**
 * @brief   Select the next forward record and move it to the back-stack.
 */
History.prototype.goForward = function () {
    this.goImpl(this.recordsFw, this.recordsBk);
}

/**
 * @brief   Select the topmost element on a stack. Then pop it and push it to its mirror stack.
 */
History.prototype.goImpl = function (stack, mirror) {
    if (stack.length === 0) {
        this.onError("No position to go to.");
        return;
    }

    var rec = stack[stack.length - 1];
    var cursor = getCursorAtRecord(rec);

    var selectable = Utils.getSelectableAtStaff(cursor, rec.staffIdx);
    curScore.selection.select(selectable);

    mirror.push(this.currRecord);
    this.currRecord = stack.pop();
    this.ignore_next_select = true;

    Utils.jumpToSelection()
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
    this.log("saving: %1 back-records,  %2 fwd-records".arg(this.recordsBk.length).arg(this.recordsFw.length));
    this.saveValue('recordsBk', this.recordsBk);
    this.saveValue('recordsFw', this.recordsFw);
    this.saveValue('currRecord', this.currRecord || {});
}

/**
 * @brief   Load records from somewhere.
 */
History.prototype.load = function () {
    this.recordsBk = this.loadValue('recordsBk');
    this.recordsFw = this.loadValue('recordsFw');
    this.currRecord = this.loadValue('currRecord') || null;
    this.log("loaded: %1 back-records,  %2 fwd-records".arg(this.recordsBk.length).arg(this.recordsFw.length));
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
