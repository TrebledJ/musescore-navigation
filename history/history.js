.import "../nav-utils.js" as Utils
.import MuseScore 3.0 as MS


function History(settings, onInfo, onError, label) {
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
    this.currScoreName = '';
    this.score = this.defaultScore();
    this.settings = settings;
    this.readonly = false;
    this.onInfo = onInfo || console.log;
    this.onError = onError || console.error;
    this.log = function (x) { console.log("[%1]:".arg(label), x); };

    // Load existing history.
    this.load();
    this.changeScore(curScore && curScore.scoreName);
}

History.prototype.setReadonly = function (val) {
    this.readonly = val || true;
}

/**
 * @brief   Check if other plugins were called by cross-checking the new record with history.
 * @return  true if the new record was due to another plugin being called, false otherwise.
 */
History.prototype.checkCrossUpdate = function (record) {
    var this_ = this;
    function check(stack, mirror) {
        if (stack.length >= 1 && isRecordEqual(stack[stack.length - 1], record)) {
            mirror.push(this_.score.currRecord);
            this_.score.currRecord = stack.pop();
            return true;
        }
        return false;
    }
    return check(this.score.recordsBk, this.score.recordsFw) || check(this.score.recordsFw, this.score.recordsBk);
}

/**
 * @brief   Record the current selected position into history.
 */
History.prototype.logPosition = function (checkCrossUpdate) {
    if (this.ignore_next_select) {
        this.log("ignoring select");
        this.ignore_next_select = false;
        return;
    }

    var record = this.getRecord();
    if (!record)
        return;

    this.log("new record: %1".arg(JSON.stringify(record)));
    // this.log("logPosition: bk: %1 / fw: %2".arg(recordsStackTrace(this.score.recordsBk)).arg(recordsStackTrace(this.score.recordsFw)));

    if (checkCrossUpdate) {
        // Perform checks to see if other plugin actions were called.
        // We'll detect by cross-checking the new selection record with the records list here.
        if (this.checkCrossUpdate(record)) {
            this.log("detected another history plugin was called...");
            // this.log("update: %1 back elements, %2 forward elements".arg(this.score.recordsBk.length).arg(this.score.recordsFw.length));
            this.save();
            return; // No need to push anythinng.
        }
    }

    this.collateAndPush(record);
}

/**
 * @brief   Retrieves and returns a new record at the user's selection.
 */
History.prototype.getRecord = function () {
    var cursor = Utils.getCursorAtSelection(this.allowedElements, null, this.segmentFilter);
    if (!cursor) {
        this.log("nothing selected");
        return null;
    }

    return {
        staffIdx: cursor.staffIdx,
        measure: Utils.getCursorMeasureNumber(cursor),
    };
}

/**
 * @brief   Try to merge the new record with the most recent record, and push it into history.
 */
History.prototype.collateAndPush = function (newRecord) {
    if (!this.score.currRecord) { // Nothing selected yet.
        this.score.currRecord = newRecord;
        return;
    }
    var collate = this.shouldCollate(newRecord, this.score.currRecord);

    // If collate, do nothing except update `currRecord`.
    if (collate) {
        this.score.currRecord = newRecord;
    } else {
        if (this.score.recordsBk.length > 0
            && !this.shouldCollate(this.score.recordsBk[this.score.recordsBk.length - 1], this.score.currRecord)) {
            // `currRecord` is far enough from the last pushed record.
            this.push(this.score.currRecord);
        } else if (this.score.recordsBk.length === 0) {
            // Or eh, there are no records so just push it.
            this.push(this.score.currRecord);
        }

        this.score.currRecord = newRecord;
    }
}

/**
 * @brief   Helper function to push into the back records and discard old records if there are too many.
 */
History.prototype.push = function (rec) {
    this.score.recordsBk.push(rec);
    while (this.score.recordsBk.length > this.maxRecords) {
        this.score.recordsBk.shift(); // Delete front.
    }
}

/**
 * @brief   Helper function for debugging, printing out recent records.
 */
History.prototype.printLast = function (n) {
    n = n || 5;
    this.log("last %1 records:".arg(n));
    for (var i = Math.max(this.score.recordsBk.length - n + 1, 0); i < this.score.recordsBk.length; i++) {
        this.log(" [%1]: m: %2 / s: %3".arg(i).arg(this.score.recordsBk[i].measure).arg(this.score.recordsBk[i].staffIdx));
    }
    if (this.score.currRecord)
        this.log(" [*]: m: %1 / s: %2".arg(this.score.currRecord.measure).arg(this.score.currRecord.staffIdx));
    else
        this.log(" [*]: null");
}

/**
 * @brief   Select the last back record and move it to the forward-stack.
 */
History.prototype.goBack = function () {
    // For recordsBk, look 2 elements back, since the top-most element is the current position.
    this.goImpl(this.score.recordsBk, this.score.recordsFw);
}

/**
 * @brief   Select the next forward record and move it to the back-stack.
 */
History.prototype.goForward = function () {
    this.goImpl(this.score.recordsFw, this.score.recordsBk);
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

    mirror.push(this.score.currRecord);
    this.score.currRecord = stack.pop();
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
 * @brief   Helper function to switch the "active internal pointer".
 */
History.prototype.changeScore = function (newName) {
    if (this.currScoreName === newName)
        return;
    if (this.currScoreName) {
        this.data[this.currScoreName] = this.score;
    }
    this.log("changing score from {%1} to {%2}".arg(this.currScoreName).arg(newName));
    if (newName) {
        this.currScoreName = newName;
        this.score = this.data[newName];
        if (this.score) {
            // this.repair();
        } else {
            this.score = this.defaultScore();
        }
    }
}

/**
 * @brief   Helper function for generating an empty history state.
 */
History.prototype.defaultScore = function () {
    return {
        recordsBk: [],
        recordsFw: [],
        currRecord: null
    };
}

/**
 * @brief   Fixes broken records. Hopefully this doesn't need to be called.
 */
History.prototype.repair = function () {
    // Nominated as the best anti-corruption watchforce of the century.
    // Repair/patch possibly corrupt data.
    function repair(stack) {
        if (!stack) return [];
        var newStack = [];
        for (var i = 0; i < stack.length; i++) {
            if (stack[i])
                newStack.push(stack[i]);
        }
        return newStack;
    }
    this.score.recordsBk = repair(this.score.recordsBk);
    this.score.recordsFw = repair(this.score.recordsFw);
}

/**
 * @brief   Clear all records.
 */
 History.prototype.clear = function () {
    this.score = this.defaultScore();
    this.data = {};
    this.save();
}

/**
 * @brief   Save records to somewhere.
 */
History.prototype.save = function () {
    if (this.readonly)
        return;
    // this.log("saving score: %1".arg(JSON.stringify(this.score)));
    if (this.currScoreName) {
        // this.log("updating data for score {%1}".arg(this.currScoreName));
        this.data[this.currScoreName] = this.score;
    }
    this.settings.data = JSON.stringify(this.data);
}

/**
 * @brief   Load records from somewhere.
 */
History.prototype.load = function () {
    this.data = JSON.parse(this.settings.data);
}

/**
 * @brief   Get a new cursor at the given record.
 */
function getCursorAtRecord(rec) {
    var cursor = curScore.newCursor();
    cursor.rewind(MS.Cursor.SCORE_START);
    for (var i = 0; i < rec.measure - 1; cursor.nextMeasure(), i++);
    cursor.staffIdx = rec.staffIdx;
    return cursor;
}

/**
 * @brief   Check if two records are equal.
 */
function isRecordEqual(rec1, rec2) {
    return rec1.staffIdx === rec2.staffIdx
        && rec1.measure === rec2.measure
}
