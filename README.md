cytoscape-edge-bend-editing
================================================================================

This package is deprecated in favour of the **cytoscape-edge-editing** package!

## Description

A Cytoscape.js extension enabling interactive editing of edge bend points, distributed under [The MIT License](https://opensource.org/licenses/MIT). 
 * To highlight bend point positions of an edge you should select the edge and unselect any other edges. Note that in determining the edge to highlight bend point positions we assume that the unvisible edges are not selected.
 * To add a bend point select the edge and unselect any other edge, right click where you want to add the bend point and click 'Add Bend Point' on the context menu (requires 'cytoscape.js-context-menus' extension). 
 * To remove a bend point select the edge and unselect any other edge, right click on the bend point and click 'Remove Bend Point' on the context menu (requires 'cytoscape.js-context-menus' extension). 
 * To move a bend point drag and drop it when the edge is the only selected edge.
 * Alternatively, 
    * You can click anywhere on the edge (if it is the only selected edge) to introduce and relocate a bend point by dragging.
    * A bend point is removed if it is dropped near the line segment between its two neighbours.
    
## Demo

Click [here](https://rawgit.com/iVis-at-Bilkent/cytoscape.js-edge-bend-editing/master/demo.html) for demo

## Dependencies

 * Cytoscape.js >=1.7.0
 * jQuery ^1.7.0 || ^2.0.0 || ^3.0.0
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
var jquery = require('jquery');
var edgeBendEditing = require('cytoscape-edge-bend-editing');

edgeBendEditing( cytoscape, jquery ); // register extension
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
// Initilize bend points for the given edges using 'options.bendPositionsFunction'
instance.initBendPoints(eles)
```

You can also get an existing instance:

```js
cy.edgeBendEditing('get'); // Returns undefined if the extension is not initialized yet
```

Or you can check if the extension is initilized before
```js
cy.edgeBendEditing('initialized');
```

## Default Options
```js
    var options = {
      // this function specifies the positions of bend points
      bendPositionsFunction: function(ele) {
        return ele.data('bendPointPositions');
      },
      // whether to initilize bend points on creation of this extension automatically
      initBendPointsAutomatically: true,
      // whether the bend editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: false,
      // the size of bend shape is obtained by multipling width of edge with this parameter
      bendShapeSizeFactor: 6,
      // whether to start the plugin in the enabled state
      enabled: true,
      // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
      addBendMenuItemTitle: "Add Bend Point",
      // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
      removeBendMenuItemTitle: "Remove Bend Point",
      // whether the bend point can be moved by arrow keys
      moveSelectedBendPointsOnKeyEvents: function () {
        return true;
      }
    };
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-edge-bend-editing https://github.com/iVis-at-Bilkent/cytoscape.js-edge-bend-editing.git`

## Team

  * [Metin Can Siper](https://github.com/metincansiper), [Ugur Dogrusoz](https://github.com/ugurdogrusoz) of [i-Vis at Bilkent University](http://www.cs.bilkent.edu.tr/~ivis)
