import QtQuick 2.0
import MuseScore 3.0
import "bookmarks.js" as B
 
MuseScore {
    id: plugin
    description: "Toggles a bookmark at the current selection to easily navigate back."
    version: "3.0.0"
    menuPath: "Plugins.Bookmarks.Toggle at Selection"

    // pluginType: "dock"
    // dockArea: "right"
    // requiresScore: false

    // width: 150
    // height: 200

    // property var bookmarkText: "bkmk"
    // property var bookmarkFontSize: 0.5
    // property var allowedElements: [Element.CHORD, Element.REST, Element.NOTE]

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        // var b = new bookmark();
        // b.foo();
        // b.hasBookmark();
        // Bar.foo();
        // console.log(JSON.stringify(Object.keys(B)));
        // console.log(JSON.stringify(Object.keys(B.A)));
        // var a = new B.A();
        // console.log(JSON.stringify(Object.keys(a)));
        // console.log(a.haha);
        // a.boo();
        // a.blah();
        var bk = new B.BookmarkCursor(console.error);
        bk.toggleBookmark();

        Qt.quit();
    }

    function bookmark()
    {
        // this.cursor = curScore.newCursor();
        this.a = 42;

        this.hasBookmark = function() {
            console.log("hasBookmark: %1".arg(this.a));
        }

        this.foo = function() {
            this.a = 400;
        }

    }

    function hasBookmark(cursor, seg)
    {

    }

    function addBookmark(seg)
    {

    }

    function removeBookmark(seg)
    {

    }

    function toggleBookmark(seg)
    {
        // 1. Cursor rewind to selection start and get the first selected element.
        // 2. If the element is valid, then we're done; we've our cursor.
        // 3. If no element selected, check curScore.selection.
        // 4. Get the element from curScore.selection.
        // 5. Get the segment from the element.
        // 6. Advance cursor to the above segment.



        var cursor = curScore.newCursor();
        cursor.rewind(Cursor.SELECTION_START);

        console.log("tick: %1   /   staff: %2".arg(cursor.tick).arg(cursor.staffIdx))
        // return;

        function getElementFromSelection()
        {
            var es = curScore.selection.elements;
            if (es.length == 0) {
                return;
            }
            return es[0];
        }

        function getSegment(e)
        {
            // Try walking up parent hierarchy within a limit and finding a segment parent.
            var limit = 5;
            for (var i = 0; e && i < limit; i++) {
                console.log("getSegment: %1 / type: %2 / name: %3".arg(i).arg(e.type).arg(e.name));
                if (e.type === Element.SEGMENT) // Found segment parent.
                    return e;
                e = e.parent;
            }
            return null; // Could not find.
        }

        function moveCursorToElement(cursor, e)
        {
            var seg = getSegment(e);
            if (!seg) {
                console.error("could not get segment");
                return null;
            }

            // Assume only a single note/rest is selected and cursor could not find it.
            // Iterate until found.
            cursor.rewind(Cursor.SCORE_START);
            while (cursor.segment) {
                if (cursor.segment.is(seg)) {
                    console.log("found matching segment!");
                    return cursor;
                }
                cursor.next();
            }
            return null;
        }

        var e = cursor.element;
        if (!e) {
            console.log("no element in cursor");
            console.log("falling back to lookup through curScore.selection...");
            console.log("curScore.selection: %1 elements".arg(curScore.selection.elements.length));

            // Handle the case where an individual note/chord is selected without range selection.
            e = getElementFromSelection();
            if (!e) {
                console.log("no element in score selection");
                return;
            }
            
            if (e.type != Element.CHORD && e.type != Element.REST && e.type != Element.NOTE) {
                console.error("selection isn't note or rest (1)");
                return;
            }
            
            cursor = moveCursorToElement(cursor, e);
            if (!cursor)
                return;
        }

        console.log("element: %1 / %2".arg(e.type).arg(e.name));
        if (e.type != Element.CHORD && e.type != Element.REST && e.type != Element.NOTE) {
            console.error("selection isn't note or rest (2)");
            return;
        }

        console.log("tick: %1   /   staff: %2".arg(cursor.tick).arg(cursor.staffIdx))

        var text = newElement(Element.STAFF_TEXT);
        text.text = bookmarkText;
        text.visible = false;
        text.fontSize *= bookmarkFontSize;
        cursor.add(text);
    }
}
