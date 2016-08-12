cytoscape-edge-bend-editing
================================================================================

## Important Note
 
 To use this extension you should include 'cytoscape.js-context-menus' extension. 
 Please see 'https://github.com/iVis-at-Bilkent/cytoscape.js-context-menus'.

## Description

A Cytoscape.js extension enables editing edge bend points. 
 * To add a bend point select the edge, right click where you want to add the bend point and click 'Add Bend Point' on the context menu (requires 'cytoscape.js-context-menus' extension). 
 * To remove a bend point select the edge, right click on the bend point and click 'Remove Bend Point' on the context menu (requires 'cytoscape.js-context-menus' extension). 
 * To move a bend point drag and drop it when the edge is selected.
 * Alternatively, 
    * You can click anywhere on the edge to introduce and relocate a bend point by dragging.
    * A bend point is removed if it is dropped near to the line between its neighbours.

## Dependencies

 * Cytoscape.js ^1.7.0
 * cytoscape-undo-redo.js(optional) ^1.0.1
 * cytoscape-context-menus.js(optional) ^2.0.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-edge-bend-editing`,
 * via bower: `bower install cytoscape-edge-bend-editing`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var edge-bend-editing = require('cytoscape-edge-bend-editing');

edge-bend-editing( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-edge-bend-editing'], function( cytoscape, edge-bend-editing ){
  edge-bend-editing( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

```js
var instance = cy.edgeBendEditing( options );
```

An instance has a number of functions available:

```js
/*
* Get segment points of the given edge in an array A,
* A[2 * i] is the x coordinate and A[2 * i + 1] is the y coordinate
* of the ith bend point. (Returns undefined if the curve style is not segments)
*/
instance.getSegmentPoints(ele);
```

You can also get an existing instance:

```js
cy.contextMenus('get');
```

## Default Options
```js
    var options = {
      // this function specifies the positions of bend points
      bendPositionsFunction: function(ele) {
        return ele.data('bendPointPositions');
      },
      // whether the bend editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: false,
      // the size of bend shape is obtained by multipling width of edge with this parameter
      bendShapeSizeFactor: 6,
      // whether to start the plugin in the enabled state
      enabled: true,
      // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
      addBendMenuItemTitle: "Add Bend Point",
      // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
      removeBendMenuItemTitle: "Remove Bend Point"
    };
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-edge-bend-editing https://github.com/iVis-at-Bilkent/cytoscape.js-edge-bend-editing.git`

## Team

  * [Metin Can Siper](https://github.com/metincansiper), [Ugur Dogrusoz](https://github.com/ugurdogrusoz) of [i-Vis at Bilkent University](http://www.cs.bilkent.edu.tr/~ivis)
