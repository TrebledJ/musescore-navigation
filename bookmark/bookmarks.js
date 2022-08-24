.import "../utils.js" as Utils
.import MuseScore 3.0 as MS

// Wrapping options for select-prev / select-next.
var WrapSelect = {
    NONE: 0,    // No wrapping.
    SCORE: 1,   // Wrap around current score.   // TODO
    ALL: 2,     // Wrap around all open scores. // TODO
};

var Direction = {
    FORWARD: 0,
    BACKWARD: 1,
};

function BookmarkCursor(onInfo, onError) {
    // Settings.
    this.wrap = WrapSelect.NONE;
    this.bookmarkText = "bkmk";
    this.bookmarkFontSize = 0.5;
    this.allowedElements = [Element.CHORD, Element.REST, Element.NOTE];

    // Private.
    this.onInfo = onInfo || console.log;
    this.onError = onError || console.error;
    this.cursor = null;
}

/**
 * @brief   Creates a bookmark element.
 */
BookmarkCursor.prototype.createBookmark = function () {
    var text = newElement(Element.STAFF_TEXT);
    text.text = this.bookmarkText;
    text.visible = false;
    text.fontSize *= this.bookmarkFontSize;
    return text;
}

/**
 * @brief   Toggles the bookmark at the current location.
 */
BookmarkCursor.prototype.toggleBookmark = function () {
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
 */
BookmarkCursor.prototype.addBookmark = function (seg) {
    var bkmk = this.createBookmark();
    this.cursor.add(bkmk);
}

/**
 * @brief   Removes the bookmark in the current segment.
 * @return  True if a bookmark was removed, false otherwise.
 */
BookmarkCursor.prototype.removeBookmark = function (seg) {
    var bkmk = this.currentBookmark();
    if (bkmk) {
        removeElement(bkmk);
        return true;
    }
    return false;
}

/**
 * @brief   Gets the current bookmark at the current cursor's segment.
 * @return  An MS Element or null.
 */
BookmarkCursor.prototype.currentBookmark = function () {
    var as = this.cursor.segment.annotations;
    for (var i = 0; i < as.length; i++) {
        if (as[i].text === this.bookmarkText)
            return as[i];
    }
    return null;
}

/**
 * @brief   Selects the element attached by the previous bookmark.
 */
BookmarkCursor.prototype.selectPrevBookmark = function () {
    this.selectBookmark(Direction.BACKWARD);
}

/**
 * @brief   Selects the element attached by the next bookmark.
 */
BookmarkCursor.prototype.selectNextBookmark = function () {
    this.selectBookmark(Direction.FORWARD);
}

/**
 * @brief   Helper to select bookmarks.
 */
BookmarkCursor.prototype.selectBookmark = function (dir) {
    var this_ = this;
    var cursor = this.getCursorAtSelection(true);
    if (cursor) {
        // Skip one element, in case current segment has a bookmark.
        (dir === Direction.FORWARD ? cursor.next() : cursor.prev());
    }
    this.foreachBookmark(
        dir,
        cursor,
        function (bkmk) {
            var e = this_.getSelectableUnderElement(bkmk);
            curScore.selection.select(e);
            return true;
        },
        function () { this_.onInfo(qsTr("No more bookmarks to select.")); }
    );
}

/**
 * @brief   Iterates through the score and calls a callback for each bookmark element found.
 * 
 * @param   direction       The search direction. Direction.FORWARD or Direction.BACKWARD
 * @param   cursor          The initial cursor. If null is provided, a default is used.
 * @param   bkmkCallback    A callback called when a bookmark element is found.
 *                          This callback is passed an MS element (the bookmark) and can
 *                          return true/false depending if the search loop should stop.
 * @param   doneCallback    A callback called after the search loop is exited.
 */
BookmarkCursor.prototype.foreachBookmark = function (direction, cursor, bkmkCallback, doneCallback) {
    if (direction !== Direction.FORWARD && direction !== Direction.BACKWARD) {
        this.onError("unknown iteration direction: %1".arg(direction));
        return;
    }

    this.cursor = cursor;
    if (!this.cursor) {
        // Fallback to a default cursor.
        this.cursor = curScore.newCursor();
        this.cursor.rewind(MS.Cursor.SCORE_START);
        // TODO: if direction == BACKWARD, start from end of score
    }

    // Searching for bookmarks.
    while (this.cursor.segment) {
        var bkmk = this.currentBookmark();
        if (bkmk) {
            var finish = bkmkCallback(bkmk);
            if (finish)
                return;
        }
        (direction === Direction.FORWARD ? this.cursor.next() : this.cursor.prev());
    }
    doneCallback();
}

/**
 * @brief   Get a selectable element under (or over) the given element.
 * @return  An MS element or null.
 */
BookmarkCursor.prototype.getSelectableUnderElement = function (element) {
    // Get the chord/note/rest under the bookmark.
    var staffIdx = Utils.getStaffIdx(this.cursor.segment, element);
    var selectable = this.cursor.segment.elementAt(4 * staffIdx);

    if (selectable && selectable.type == Element.CHORD) {
        // Can't select chords, so we'll select the first note.
        if (selectable.notes.length == 0) {
            this.onError("chord with bookmark does not have note?");
            return null;
        }
        selectable = selectable.notes[0];
    }

    if (!selectable) {
        this.onError("staff element to select not found")
        return null;
    }
    return selectable;
}

/**
 * @brief   Clear all bookmark elements.
 */
BookmarkCursor.prototype.clearAllBookmarks = function () {
    var cursor = curScore.newCursor();
    cursor.rewind(MS.Cursor.SCORE_START);

    var this_ = this;
    this.foreachBookmark(
        Direction.FORWARD,
        cursor,
        function (bkmk) { removeElement(bkmk); },
        function () { this_.onInfo(qsTr("All bookmarks cleared!")); }
    );
}

/**
 * @brief   Get a MS cursor at the selected note or elements.
 * @return  An MS cursor or null.
 */
BookmarkCursor.prototype.getCursorAtSelection = function (suppressError) {
    return Utils.getCursorAtSelection(this.allowedElements, suppressError ? null : this.onError);
}
