# musescore-navigation
Feature-rich navigation plugin set for MuseScore. Jump around like a deranged person walking bare foot on a hot beach.

Inspired by common IDE functionality/extensions, these plugins are intended for composers, arrangers, and—well, MuseScore users in general—enhancing the quality of life of navigating and editing scores.

## Installation
To install, unzip the extension into your local MuseScore plugins folder. I highly recommend placing the musescore-navigation plugin in its own folder so that you can copy and replace it easily when new updates arrive.

Example file structure:

```
Plugins
├── example-plugin.qml
└── musescore-navigation
    ├── nav-utils.js
    ├── bookmarks
    │   ├── bookmarks.js
    │   ├── nav-bookmark-clear-all.qml
    │   ├── nav-bookmark-prev.qml
    │   ├── nav-bookmark-next.qml
    │   └── nav-bookmark-toggle.qml
    └── history
        ├── history.js
        ├── nav-history-back.qml
        ├── nav-history-forward.qml
        └── nav-history-ui.qml
```

**Important**: Make sure the relative structure between `nav-utils.js` and the other modules are kept as-is! Otherwise imports may break and the tears of Mozart will rain upon Venice.

## Modules
A couple modules are provided with this package. Generally speaking, there are two kinds of plugins provided:

* **Action Plugins**. These are run once and finish almost immediately. No UI. It's a good idea to bind shortcuts for these.
* **UI Plugins**. These are dialog/dock plugins which are kept alive to play with.

You can enable and disable whatever you like. There are no limitations.

Well... except for the history module. Read more about it's usage below.

### Bookmarks
Marks down a section, saving it so that you can easily return to it later without the pain of scrolling.

This is really useful for large scores, where scrolling from front to middle to end can be pain. An existing built-in way to jump around sections is to use rehearsal marks plus MuseScore's timeline. However, I find this insufficient since a rehearsal mark only carries horizontal positioning info (measures), but not vertical positioning info (staffs).

#### Usage
With `musescore-navigation.bookmarks`, there are four (4) commands to be aware of:

* **Toggle at Selection** (`nav-bookmark-toggle`). Toggles a bookmark at your current selection. If nothing is selected, you get an error.
* **Select Previous Bookmark** (`nav-bookmark-prev`). Jumps to the previous bookmark and selects the note/rest underneath.
* **Select Next Bookmark** (`nav-bookmark-next`). Jumps to the next bookmark and selects the note/rest underneath.
* **Clear All** (`nav-bookmark-clear-all`). Removes all bookmarks from the current score.

I like to use keybindings for the first three plugins to easily toggle and jump between bookmarks.

* Toggle: **<kbd>⌥</kbd> + <kbd>K</kbd>**
* Previous: **<kbd>⌥</kbd> + <kbd>J</kbd>**
* Next: **<kbd>⌥</kbd> + <kbd>L</kbd>**

#### Notes
* Implementation-wise, the plugin uses tiny invisible staff-text to keep track of—and search for—bookmarks. You may add or delete them as you like without any impact to the plugin.
* Make sure to select a note, chord, rest, or range before toggling.

### History
This plugin keeps track of where your cursor has been so that you can easily jump back and forth between different points in time (effectively making you a time traveller!).

#### Usage
To use, you'll need to keep the `History UI` plugin open **at all times**! This has two implications, you'll need to:

1. Enable the plugin.
2. Remember to open it *for each new MuseScore session*. A shortcut may be useful.

With `musescore-navigation.history`, there are three (3) commands to be aware of:

* **History UI** (`nav-history-ui`). This should always be enabled and activated to use the other history commands.
* **Go Back** (`nav-history-back`). Jumps back to your previous cursor position.
* **Go Forward** (`nav-history-forward`). Jumps forward to your next cursor position.

The UI plugin is needed to track your cursor position and keep a history of it. (Don't worry, none of your data will be used elsewhere outside of MuseScore's plugins.)

#### Notes
* There is a limit to the number of cursor positions tracked. By default, it's 40.
* Cursor positions are tracked independently *for each score*. For example, if you open Score A, jump around, switch to Score B, jump around there, then go back to Score A; your history for Score A is kept intact! I personally think this is pretty useful.

