

function BookmarkCursor(onError) {
    this.onError = onError || console.error;
    this.bookmarkText = "bkmk";
    this.bookmarkFontSize = 0.5;
    this.allowedElements = [Element.CHORD, Element.REST, Element.NOTE];
    this.cursor = null;
}

/**
 * @brief   Toggles the bookmark at the current location.
 */
BookmarkCursor.prototype.toggleBookmark = function () {
    // if (!this.isElementSelected()) {
    //     this.onError("element not selected");
    //     return;
    // }

    this.cursor = this.getCursorAtSelection();
    if (!this.cursor) {
        this.onError("toggleBookmark: expected cursor");
        return;
    }

    if (!this.cursor.segment) {
        this.onError("toggleBookmark: expected segment");
        return;
    }

    if (!this.removeBookmark()) {
        this.addBookmark();
    }
}

/**
 * @brief   Adds a bookmark in the current location.
 * // TODO: what if no bookmark?
 */
BookmarkCursor.prototype.addBookmark = function (seg) {
    var text = newElement(Element.STAFF_TEXT);
    text.text = this.bookmarkText;
    text.visible = false;
    text.fontSize *= this.bookmarkFontSize;
    this.cursor.add(text);
}

/**
 * @brief   Removes the bookmark in the current segment.
 * @return  True if a bookmark was removed, false otherwise.
 */
BookmarkCursor.prototype.removeBookmark = function (seg) {
    var as = this.cursor.segment.annotations;
    for (var i = 0; i < as.length; i++) {
        if (as[i].text === this.bookmarkText) {
            removeElement(as[i]);
            return true;
        }
    }
    return false;
}

/**
 * @brief   Checks whether the cursor is currently residing at a bookmark.
 * @return  true or false.
 */
// BookmarkCursor.prototype.isAtBookmark = function () {
//     var as = seg.annotations;
//     for (var i = 0; i < as.length; i++) {
//         console.log("isAtBookmark: checking annotation: %1".arg(as[i].text));
//         if (as[i].text === this.bookmarkText)
//             return true;
//     }
//     return false;
// }

/**
 * @brief   Rewinds the cursor to the previous bookmark.
 */
BookmarkCursor.prototype.goToPrevBookmark = function () {

}

/**
 * @brief   Advances the cursor to the next bookmark.
 */
BookmarkCursor.prototype.goToNextBookmark = function () {

}


/**
 * @brief   Gets the element where the previous bookmark marker is.
 * @return  An MS element. If none exists, returns null.
 */
BookmarkCursor.prototype.prevBookmarkElement = function () {

}

/**
 * @brief   Gets the element where the next bookmark marker is.
 * @return  An MS element. If none exists, returns null.
 */
BookmarkCursor.prototype.nextBookmarkElement = function () {

}


/**
 * @brief   Checks whether an element is selected.
 * @return  true or false.
 */
BookmarkCursor.prototype.isElementSelected = function () {

}

/**
 * @brief   Get the segment of the selected element.
 * @return  An MS element if found, null otherwise.
 */
// BookmarkCursor.prototype.getSegment = function () {

// }

/**
 * @brief   Get a MS cursor at the given segment.
 * @return  An MS cursor or null.
 */
BookmarkCursor.prototype.getCursorAtSelection = function () {
    // 1. Cursor rewind to selection start and get the first selected element.
    // 2. If the element is valid, then we're done; we've our cursor.
    // 3.a. If no element selected, check curScore.selection. This means an individual note/rest is selected.
    // 3.b. Get the element from curScore.selection.
    // 4. Get the segment from the element.
    // 5. Advance cursor to the above segment.

    var cursor = curScore.newCursor();

    // 1.
    cursor.rewind(Cursor.SELECTION_START);

    // 2.
    var e = cursor.element;
    if (e) {
        if (!includes(this.allowedElements, e.type)) {
            this.onError("selection isn't note or rest (1)");
            return null;
        }
        return cursor;
    }

    // 3.
    var es = curScore.selection.elements;
    if (es.length == 0) {
        return null;
    }
    e = es[0];

    console.log("element: %1 / %2".arg(e.type).arg(e.name));
    if (!includes(this.allowedElements, e.type)) {
        this.onError("selection isn't note or rest (2)");
        return null;
    }

    // 4.
    var seg = getParentSegment(e);
    if (!seg) {
        this.onError("could not get parent segment of %1".arg(e));
        return null;
    }

    // 5.
    cursor.rewind(Cursor.SCORE_START);
    while (cursor.segment) {
        if (cursor.segment.is(seg)) {
            console.log("found matching segment!");
            return cursor;
        }
        cursor.next();
    }
    this.onError("could not find matching segment for element from curScore.selection (%1)".arg(e));
    return null;
}

// ---------------------------------------------------------------

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

// ---------------------------------------------------------------

function B() {
    console.log("B");
}


function A() {
    console.log("A");

    this.boo = function () {
        console.log("A.boo");
    }

    this.haha = 1;
}

A.prototype.blah = function () {
    console.log("A.blah");
}
