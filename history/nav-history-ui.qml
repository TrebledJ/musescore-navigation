import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import QtQuick.Layouts 1.1
import Qt.labs.settings 1.0

MuseScore {
    id: plugin
    description: "Keeps track of your cursor so that you can jump back to where you were before."
    version: "3.5.0"
    menuPath: "Plugins.History.UI"

    pluginType: "dock"
    // dockArea: "right"
    requiresScore: false

    width: 100
    height: 40

    property var prevScore: null
    property var prevRecord: null
    property var positions: []

    property int collateMeasureThreshold = 1;
    property int collateStaffIdxThreshold = 1;
    property int maxRecords = 40;

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        prevScore = curScore;
        logPosition();
    }

    onScoreStateChanged: {
        if (!curScore.is(prevScore)) {
            console.log("score changed");
            positions = [];
        } else if (state.selectionChanged) {
            console.log("selection changed");
            logPosition();
        }
        
        prevScore = curScore;
    }

    function logPosition()
    {
        var record = getRecord();
        if (!record)
            return;

        console.log(JSON.stringify(record));
        pushRecord(record);
    }

    function getRecord()
    {
        var cursor = getCursorAtSelection();
        if (!cursor) {
            console.log("nothing selected");
            return null;
        }

        var cursor2 = curScore.newCursor();
        cursor2.rewind(Cursor.SCORE_START);
        var mNumber = 1;
        while (!cursor2.measure.is(cursor.measure)) {
            mNumber++;
            cursor2.nextMeasure();
        }

        return {
            staffIdx: cursor.staffIdx,
            measure: mNumber,
            part: cursor.element.staff.part.partName,
        };
    }

    function pushRecord(curr)
    {
        var collate = true;
        if (positions.length > 0) {
            collate = shouldCollate(curr, prevRecord);
        }

        // If collate, do nothing except update `prevRecord`.
        if (!collate) {
            console.log("adding record");
            positions.push(curr);

            if (positions.length > maxRecords) {
                positions.shift();
            }

            var n = 5;
            console.log("last %1 positions:".arg(n));
            for (var i = Math.max(positions.length - n, 0); i < positions.length; i++) {
                console.log(" [%1]: m: %2 / s: %3 / p: %4".arg(i).arg(positions[i].measure).arg(positions[i].staffIdx).arg(positions[i].part));
            }
        }
        prevRecord = curr;
    }

    function shouldCollate(rec1, rec2)
    {
        if (Math.abs(prev.measure - curr.measure) <= collateMeasureThreshold
            && Math.abs(prev.staffIdx - curr.staffIdx) <= collateStaffIdxThreshold) {
            return true;
        }
        return false;
    }

    function goBack() {
        console.log("back");
    }

    function goForward() {
        console.log("forward");
    }

    /**
     * @brief   Get a MS cursor at the selected note or elements.
     * @return  An MS cursor or null.
     */
    function getCursorAtSelection(allowedElements, onError) {
        allowedElements = allowedElements || [Element.CHORD, Element.REST, Element.NOTE];
        onError = onError || console.error;
        // 1. Cursor rewind to selection start and get the first selected element.
        // 2. If the element is valid, then we're done; we've our cursor.
        // 3.a. If no element selected, check curScore.selection. This means an individual note/rest is selected.
        // 3.b. Get the element from curScore.selection.
        // 4. Get the segment from the element.
        // 5. Advance cursor to said segment.
        // 6. Set correct staffIdx as selected element.

        var cursor = curScore.newCursor();

        // 1.
        cursor.rewind(Cursor.SELECTION_START);

        if (!cursor.segment && !cursor.element && curScore.selection.elements.length === 0) {
            onError(qsTr("Please select a note or rest, and try again."));
            return null;
        }

        // 2.
        var e = cursor.element;
        if (e) {
            if (!includes(allowedElements, e.type)) {
                onError(qsTr("Selection isn't note or rest."));
                return null;
            }
            console.log("found cursor from range selection");
            return cursor;
        }

        console.log("could not find cursor...");
        console.log("falling back to analysing curScore.selection...");

        // 3.
        var es = curScore.selection.elements;
        if (es.length == 0) {
            return null;
        }
        e = es[0];

        console.log("element: %1 / %2".arg(e.type).arg(e.name));
        if (!includes(allowedElements, e.type)) {
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
        cursor.rewind(Cursor.SCORE_START);
        while (cursor.segment) {
            if (cursor.segment.is(seg)) {
                console.log("found matching segment");
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
        console.log("staffIdx: %1 / num: %2".arg(staffIdx).arg(staves.length));

        return cursor;
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


    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10

        RowLayout {
            width: parent.width

            Button {
                Layout.fillWidth: true
                text: qsTr("<-")
                onClicked: goBack()
            }

            Button {
                Layout.fillWidth: true
                text: qsTr("->")
                onClicked: goForward()
            }
        }
    }
}
