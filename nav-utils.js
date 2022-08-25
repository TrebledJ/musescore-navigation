.import MuseScore 3.0 as MS

/**
 * @brief   Get a MS cursor at the selected note or elements.
 * @return  An MS cursor or null.
 */
function getCursorAtSelection(allowedElements, onError, segmentFilter) {
    // 1. Cursor rewind to selection start and get the first selected element.
    // 2. If the element is valid, then we're done; we've our cursor.
    // 3.a. If no element selected, check curScore.selection. This means an individual note/rest is selected.
    // 3.b. Get the element from curScore.selection.
    // 4. Get the segment from the element.
    // 5. Advance cursor to said segment.
    // 6. Set correct staffIdx as selected element.

    onError = onError || function(_, _, _, _, _) {}; // Silence errors by default.

    var cursor = curScore.newCursor();

    // 1.
    cursor.rewind(MS.Cursor.SELECTION_START);

    if (segmentFilter)
        cursor.filter = segmentFilter;

    // console.log("curScore.selection: %1 elements".arg(curScore.selection.elements.length));

    if (!cursor.segment && !cursor.element && curScore.selection.elements.length === 0) {
        onError(qsTr("Please select a note or rest, and try again."));
        return null;
    }

    // 2.
    var e = cursor.element;
    if (e) {
        if (allowedElements && !includes(allowedElements, e.type)) {
            onError(qsTr("Selection isn't note or rest."));
            return null;
        }
        // console.log("found cursor from range selection");
        return cursor;
    }

    // console.log("could not find cursor...");
    // console.log("falling back to analysing curScore.selection...");

    // 3.
    var es = curScore.selection.elements;
    if (es.length == 0) {
        return null;
    }
    e = es[0];

    // console.log("element: %1 / %2".arg(e.type).arg(e.name));
    if (allowedElements && !includes(allowedElements, e.type)) {
        onError(qsTr("Selection isn't note or rest."));
        return null;
    }

    // 4.
    var seg = getParentSegment(e);
    if (!seg) {
        onError("could not get parent segment of %1".arg(e));
        return null;
    }

    // 5.
    cursor.rewind(MS.Cursor.SCORE_START);
    while (cursor.segment) {
        if (cursor.segment.is(seg)) {
            // console.log("found matching segment");
            break;
        }
        cursor.next();
    }

    if (!cursor.segment) {
        onError("could not find matching segment for element from curScore.selection (%1)".arg(e));
        return null;
    }

    // 6.
    var staves = getStaves(seg);
    var staffIdx = indexOfStaff(staves, e);
    cursor.staffIdx = staffIdx;
    // console.log("staffIdx: %1 / num: %2".arg(staffIdx).arg(staves.length));

    return cursor;
}

/**
 * @brief   Get the measure number the given cursor is at.
 * @return  The measure number, where the first measure is 1 (not 0).
 */
function getCursorMeasureNumber(cursor) {
    var cursor2 = curScore.newCursor();
    cursor2.rewind(MS.Cursor.SCORE_START);
    var mNumber = 1;
    while (!cursor2.measure.is(cursor.measure)) {
        mNumber++;
        cursor2.nextMeasure();
    }
    return mNumber;
}

/**
 * @brief   Get a selectable element at the given staff index and cursor position.
 * @return  An MS element or null.
 */
function getSelectableAtStaff(cursor, staffIdx) {
    return getSelectableAtTrack(cursor, 4 * staffIdx);
}

/**
 * @brief   Get a selectable element at the given track and cursor position.
 * @return  An MS element or null.
 */
function getSelectableAtTrack(cursor, track) {
    // Get the chord/note/rest under the bookmark.
    var selectable = cursor.segment.elementAt(track);

    if (selectable && selectable.type === Element.CHORD) {
        // Can't select chords, so we'll select the first note.
        if (selectable.notes.length === 0) {
            console.error("chord with bookmark does not have note?");
            return null;
        }
        selectable = selectable.notes[0];
    }

    if (!selectable) {
        console.error("staff element to select not found");
        return null;
    }
    return selectable;
}

function getParentSegment(e) {
    // Try walking up parent hierarchy within a limit and finding a segment parent.
    var limit = 5;
    for (var i = 0; e && i < limit; i++) {
        if (e.type === Element.SEGMENT) // Found segment parent.
            return e;
        e = e.parent;
    }
    return null; // Could not find.
}

function includes(array, element) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === element)
            return true;
    }
    return false;
}

function getStaves(seg) {
    var staves = [];
    for (var i = 0; ; i++) {
        var e = seg.elementAt(4 * i);
        if (!e)
            break;
        staves.push(e.staff);
    }
    return staves;
}

function indexOfStaff(staves, e) {
    for (var i = 0; i < staves.length; i++) {
        if (staves[i].is(e.staff))
            return i;
    }
    return -1;
}

function getStaffIdx(seg, e) {
    return indexOfStaff(getStaves(seg), e);
}

function jumpToSelection() {
    // Toggle note input. A bit hacky, but it does the job.
    cmd("note-input");
    cmd("note-input");
}
