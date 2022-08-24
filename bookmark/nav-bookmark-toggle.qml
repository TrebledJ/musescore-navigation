import QtQuick 2.0
import MuseScore 3.0
import QtQuick.Controls 1.0
import QtQuick.Dialogs 1.2
import "bookmarks.js" as B
 
MuseScore {
    id: plugin
    description: "Action to toggle a bookmark at the current selection."
    version: "3.5.0"
    menuPath: "Plugins.Bookmarks.Toggle at Selection"

    onRun: {
        if (!curScore) {
            Qt.quit();
        }

        var bk = new B.BookmarkCursor(onError);
        bk.toggleBookmark();
        Qt.quit();
    }

    function onError(msg)
    {
        errorDialog.text = qsTr("An error occurred: %1".arg(msg));
        errorDialog.open();
    }

    MessageDialog {
        id: errorDialog
        title: qsTr("Error")
        onAccepted: Qt.quit()
    }
}
