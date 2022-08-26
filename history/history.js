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
    this.label = label;
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
 * @returns True if this instance comes from an action plugin, false otherwise.
 */
History.prototype.isAction = function () {
    return this.label !== "ui";
}

/**
 * @brief   Check if other plugins were called by cross-checking the new record with history.
 *          If a plugin-call was detected, update the state here also.
 * @return  true if the new record was due to another plugin being called, false otherwise.
 */
History.prototype.checkCrossUpdate = function () {
    var newScore = this.loadActionData();
    if (!newScore || !newScore.recordsBk || !newScore.recordsFw) {
        // this.log("new score has no records...");
        return;
    }

    this.clearActionData(); // Clear action data after reading.

    // this.log("comparing old score:");
    // printScoreData(this.score);
    // this.log(" ... with new score:");
    // printScoreData(newScore);

    if (newScore.recordsBk.length !== this.score.recordsBk.length) { // If length changed.
        if (Math.abs(newScore.recordsBk.length - this.score.recordsBk.length) !== 1) {
            this.onError("detected newScore length: %1, with oldScore length: %2. Expected difference to be equal to 1."
                            .arg(newScore.recordsBk.length).arg(this.score.recordsBk.length));
            return false;
        }
        if (newScore.recordsBk.length < this.score.recordsBk.length) {
            // Back records are shorter ==> go back.
            this.push(this.score.recordsFw, this.score.currRecord);
            this.score.currRecord = this.score.recordsBk.pop();
        } else {
            // Forward records are shorter ==> go forward.
            this.push(this.score.recordsBk, this.score.currRecord);
            this.score.currRecord = this.score.recordsFw.pop();
        }
        return true;
    }
    return false;
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

    if (checkCrossUpdate) {
        // Perform checks to see if other plugin actions were called.
        // We'll detect by cross-checking the new selection record with the records list here.
        if (this.checkCrossUpdate()) {
            this.log("detected another history plugin was called...");
            // this.log("update: %1 back elements, %2 forward elements".arg(this.score.recordsBk.length).arg(this.score.recordsFw.length));
            return; // No need to push anythinng.
        }
    }

    var record = this.getRecord();
    if (!record)
        return;

    this.log("new record: %1".arg(JSON.stringify(record)));
    // this.log("logPosition: bk: %1 / fw: %2".arg(recordsStackTrace(this.score.recordsBk)).arg(recordsStackTrace(this.score.recordsFw)));

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
            this.push(this.score.recordsBk, this.score.currRecord);
        } else if (this.score.recordsBk.length === 0) {
            // Or eh, there are no records so just push it.
            this.push(this.score.recordsBk, this.score.currRecord);
        }

        this.score.currRecord = newRecord;

        if (this.score.recordsFw.length > 0
            && this.shouldCollate(newRecord, this.score.recordsFw[this.score.recordsFw.length - 1])) {
            // The new position is close the top of the forward stack.
            // So it's as if the user went forward by themselves without pressing the go-forward shortcut (:facepalm:).
            this.score.recordsFw.pop();
        }
    }
}

/**
 * @brief   Helper function to push into the back records and discard old records if there are too many.
 */
History.prototype.push = function (stack, rec) {
    stack.push(rec);
    while (stack.length > this.maxRecords) {
        stack.shift(); // Delete front.
    }
}

/**
 * @brief   Helper function for debugging, printing out recent records.
 */
History.prototype.printLast = function (n) {
    n = n || 5;
    this.log("recent %1 records:".arg(n));
    for (var i = Math.max(this.score.recordsBk.length - n + 1, 0); i < this.score.recordsBk.length; i++) {
        this.log(" [-%1]: m: %2 / s: %3".arg(this.score.recordsBk.length - i).arg(this.score.recordsBk[i].measure).arg(this.score.recordsBk[i].staffIdx));
    }
    if (this.score.currRecord)
        this.log(" [*]: m: %1 / s: %2".arg(this.score.currRecord.measure).arg(this.score.currRecord.staffIdx));
    else
        this.log(" [*]: null");
    for (var i = 0; i < Math.min(this.score.recordsFw.length, n); i++) {
        var idx = this.score.recordsFw.length - 1 - i;
        this.log(" [%1]: m: %2 / s: %3".arg(i+1).arg(this.score.recordsFw[idx].measure).arg(this.score.recordsFw[idx].staffIdx));
    }
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
    

    this.push(mirror, this.score.currRecord);
    this.score.currRecord = stack.pop();
    if (this.isAction()) {
        this.saveActionData(); // Save action data before selecting.
    }
    
    var selectable = Utils.getSelectableAtStaff(cursor, rec.staffIdx);
    var res = curScore.selection.select(selectable);

    if (!res) {
        this.onError("an error occurred in selecting measure %1, staff: %2.".arg(rec.measure).arg(rec.staffIdx));
        return;
    }

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
    // this.save();
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

History.prototype.clearActionData = function () {
    curScore.setMetaTag('nav.history.action.data', '');
}

History.prototype.saveActionData = function () {
    curScore.setMetaTag('nav.history.action.data', JSON.stringify(this.score));
}

History.prototype.loadActionData = function () {
    return JSON.parse(curScore.metaTag('nav.history.action.data') || 'null');
}

// -------------------------------------------------------------------------------------------

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

function stringifyRecords(r) {
    var ms = [];
    for (var i = 0; i < r.length; i++)
        ms.push(r[i].measure);
    return JSON.stringify(ms);
}

function printScoreData(score) {
    this.log(" - bk: %1".arg(stringifyRecords(score.recordsBk)));
    this.log(" - fw: %1".arg(stringifyRecords(score.recordsFw)));
    this.log(" - curr: %1".arg(JSON.stringify(score.currRecord)));
}
