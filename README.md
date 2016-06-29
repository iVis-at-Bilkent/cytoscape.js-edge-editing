cytoscape-edge-bend-editing
================================================================================


## Description

A Cytoscape.js extension enables editing edge bend points. 
 * To add a bend point right click where you want to add the bend point and click 'Add Bend Point' on the context menu. 
 * To remove a bend point click on the bend point and click 'Remove Bend Point' on the context menu. 
 * To move a bend point drag and drop it.
    (Note that these operations can be performed if the edge is selected)


## Dependencies

 * Cytoscape.js ^1.7.0
 * cytoscape-undo-redo.js(optional) ^1.0.1


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

`cy.expandCollapse(options)`
To initialize with options.

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
      enabled: true
    };
```


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-edge-bend-editing https://github.com/iVis-at-Bilkent/cytoscape.js-edge-bend-editing.git`

## Team

  * [Metin Can Siper](https://github.com/metincansiper), [Ugur Dogrusoz](https://github.com/ugurdogrusoz) of [i-Vis at Bilkent University](http://www.cs.bilkent.edu.tr/~ivis)
