import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import "bookmarks.js" as B
 
MuseScore {
    id: plugin
    description: "Action to select the previous bookmark."
    version: "3.5.0"
    menuPath: "Plugins.Bookmarks.Select Previous Bookmark"

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        var bk = new B.BookmarkCursor(onInfo, onError);
        bk.selectPrevBookmark();

        // Refresh canvas and jump to selection.
        cmd("note-input");
        cmd("note-input");
        Qt.quit();
    }

    function onInfo(msg)
    {
        dialog.text = msg;
        dialog.title = qsTr("Info");
        dialog.icon = StandardIcon.Information;
        dialog.open();
    }

    function onError(msg)
    {
        dialog.text = qsTr("Error") + ": " + msg;
        dialog.title = qsTr("Error");
        dialog.icon = StandardIcon.Warning;
        dialog.open();
    }

    MessageDialog {
        id: dialog
        onAccepted: Qt.quit()
    }
}
