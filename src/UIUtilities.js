var debounce = require('./debounce');
var bendPointUtilities = require('./bendPointUtilities');
var registerUndoRedoFunctions = require('./registerUndoRedoFunctions');

module.exports = function (params) {
  var fn = params;

  var ePosition, eRemove, eZoom, eSelect, eUnselect, eTapStart, eTapDrag, eTapEnd, eCxtTap, eTap;
  var functions = {
    init: function () {
      // register undo redo functions
      registerUndoRedoFunctions();
      
      var self = this;
      var opts = params;
      var $container = $(this);
      var cy;
      var $canvas = $('<canvas></canvas>');

      $container.append($canvas);
      
      var $ctxAddBendPoint = $('<menu title="Add Bend Point" id="cy-edge-bend-editing-ctx-add-bend-point" class="cy-edge-bend-editing-ctx-operation"></menu>');
      var $ctxRemoveBendPoint = $('<menu title="Remove Bend Point" id="cy-edge-bend-editing-ctx-remove-bend-point" class="cy-edge-bend-editing-ctx-operation"></menu>');
      
      $('body').append($ctxAddBendPoint);
      $('body').append($ctxRemoveBendPoint);
      
      document.getElementById("cy-edge-bend-editing-ctx-add-bend-point").addEventListener("contextmenu",function(event){
        event.preventDefault();
      },false);

      document.getElementById("cy-edge-bend-editing-ctx-remove-bend-point").addEventListener("contextmenu",function(event){
          event.preventDefault();
      },false);

      $('.cy-edge-bend-editing-ctx-operation').click(function (e) {
        $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');
      });

      $ctxAddBendPoint.click(function (e) {
        var edge = bendPointUtilities.currentCtxEdge;
        
        if(!edge.selected()) {
          return;
        }
        
        var param = {
          edge: edge,
          weights: edge.data('weights')?[].concat(edge.data('weights')):edge.data('weights'),
          distances: edge.data('distances')?[].concat(edge.data('distances')):edge.data('distances')
        };
        
        bendPointUtilities.addBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        clearDraws();
        renderBendShapes(edge);
        
      });

      $ctxRemoveBendPoint.click(function (e) {
        var edge = bendPointUtilities.currentCtxEdge;
        
        if(!edge.selected()) {
          return;
        }
        
        var param = {
          edge: edge,
          weights: [].concat(edge.data('weights')),
          distances: [].concat(edge.data('distances'))
        };

        bendPointUtilities.removeBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        clearDraws();
        renderBendShapes(edge);
      });
      
      var _sizeCanvas = debounce(function () {
        $canvas
          .attr('height', $container.height())
          .attr('width', $container.width())
          .css({
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': '999'
          })
        ;

        setTimeout(function () {
          var canvasBb = $canvas.offset();
          var containerBb = $container.offset();

          $canvas
            .css({
              'top': -(canvasBb.top - containerBb.top),
              'left': -(canvasBb.left - containerBb.left)
            })
          ;

          // redraw on canvas resize
          if(cy){
            clearDraws(true);
          }
        }, 0);

      }, 250);

      function sizeCanvas() {
        _sizeCanvas();
      }

      sizeCanvas();

      $(window).bind('resize', function () {
        sizeCanvas();
      });

      var ctx = $canvas[0].getContext('2d');

      // write options to data
      var data = $container.data('cyedgebendediting');
      if (data == null) {
        data = {};
      }
      data.options = opts;

      var optCache;

      function options() {
        return optCache || (optCache = $container.data('cyedgebendediting').options);
      }
      
      // we will need to convert model positons to rendered positions
      function convertToRenderedPosition(modelPosition) {
        var pan = cy.pan();
        var zoom = cy.zoom();

        var x = modelPosition.x * zoom + pan.x;
        var y = modelPosition.y * zoom + pan.y;

        return {
          x: x,
          y: y
        };
      }

      function clearDraws(renderSelectedBendShapes) {

        var w = $container.width();
        var h = $container.height();

        ctx.clearRect(0, 0, w, h);
        
        if( renderSelectedBendShapes ) {
          var selectedEdges = cy.edges(':selected');
        
          for( var i = 0; i < selectedEdges.length; i++ ) {
            var edge = selectedEdges[i];
            renderBendShapes(edge);
          }
        }
      }
      
      
      // render the bend shapes of the given edge
      function renderBendShapes(edge) {
        var cy = edge.cy();
        
        if(!edge.hasClass('edgebendediting-hasbendpoints')) {
          return;
        }
        
        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rscratch.segpts;
        var length = getBendShapesLenght(edge);
        
        var srcPos = edge.source().position();
        var tgtPos = edge.target().position();
        
        var weights = edge.data('weights');
        var distances = edge.data('distances');

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var oldStyle = ctx.fillStyle;
          ctx.fillStyle = edge.css('line-color');
          renderBendShape(bendX, bendY, length);
          ctx.fillStyle = oldStyle;
        }
      }
      
      // render a bend shape with the given parameters
      function renderBendShape(bendX, bendY, length) {
        // get the top left coordinates
        var topLeftX = bendX - length / 2;
        var topLeftY = bendY - length / 2;
        
        // convert to rendered parameters
        var renderedTopLeftPos = convertToRenderedPosition({x: topLeftX, y: topLeftY});
        length *= cy.zoom();
        
        // render bend shape
        ctx.beginPath();
        ctx.rect(renderedTopLeftPos.x, renderedTopLeftPos.y, length, length);
        ctx.fill();
        ctx.closePath();
      }
      
      // get the length of bend points to be rendered
      function getBendShapesLenght(edge) {
        var factor = options().bendShapeSizeFactor;
        var length = parseFloat(edge.css('width')) * factor;
        return length;
      }
      
      // check if the point represented by {x, y} is inside the bend shape
      function checkIfInsideBendShape(x, y, length, centerX, centerY){
        var minX = centerX - length / 2;
        var maxX = centerX + length / 2;
        var minY = centerY - length / 2;
        var maxY = centerY + length / 2;
        
        var inside = (x >= minX && x <= maxX) && (y >= minY && y <= maxY);
        return inside;
      }

      // get tge index of bend point containing the point represented by {x, y}
      function getContainingBendShapeIndex(x, y, edge) {
        if(edge.data('weights') == null || edge.data('weights').lenght == 0){
          return -1;
        }

        var segpts = edge._private.rscratch.segpts;
        var length = getBendShapesLenght(edge);

        for(var i = 0; segpts && i < segpts.length; i = i + 2){
          var bendX = segpts[i];
          var bendY = segpts[i + 1];

          var inside = checkIfInsideBendShape(x, y, length, bendX, bendY);
          if(inside){
            return i / 2;
          }
        }

        return -1;
      };

      // last status of gestures
      var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
      
      // store the current status of gestures and set them to false
      function disableGestures() {
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();

        cy.zoomingEnabled(false)
          .panningEnabled(false)
          .boxSelectionEnabled(false);
      }
      
      // reset the gestures by their latest status
      function resetGestures() {
        cy.zoomingEnabled(lastZoomingEnabled)
          .panningEnabled(lastPanningEnabled)
          .boxSelectionEnabled(lastBoxSelectionEnabled);
      }

      $container.cytoscape(function (e) {
        cy = this;
        clearDraws(true);
        
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();
        
        cy.bind('zoom pan', eZoom = function () {
          clearDraws(true);
        });

        cy.on('position', 'node', ePosition = function () {
          var node = this;
          
          clearDraws(true);
        });

        cy.on('remove', 'edge', eRemove = function () {
          var node = this;
          
          // TODO
        });
        
        cy.on('select', 'edge', eSelect = function () {
          var edge = this;
          
          renderBendShapes(edge);
        });
        
        cy.on('unselect', 'edge', eUnselect = function () {
          var edge = this;
          
          clearDraws(true);
        });
        
        var movedBendIndex;
        var movedBendEdge;
        var moveBendParam;
        
        cy.on('tapstart', 'edge', eTapStart = function (event) {
          var edge = this;
          
          moveBendParam = {
            edge: edge,
            weights: edge.data('weights') ? [].concat(edge.data('weights')) : edge.data('weights'),
            distances: edge.data('distances') ? [].concat(edge.data('distances')) : edge.data('distances')
          };
          
          var cyPosX = event.cyPosition.x;
          var cyPosY = event.cyPosition.y;

          var index = getContainingBendShapeIndex(cyPosX, cyPosY, edge);
          if (index != -1) {
            movedBendIndex = index;
            movedBendEdge = edge;
            disableGestures();
          }
        });
        
        cy.on('tapdrag', eTapDrag = function (event) {
          var edge = movedBendEdge;
          
          if (movedBendEdge === undefined || movedBendIndex === undefined) {
            return;
          }

          var weights = edge.data('weights');
          var distances = edge.data('distances');

          var relativeBendPosition = bendPointUtilities.convertToRelativeBendPosition(edge, event.cyPosition);
          weights[movedBendIndex] = relativeBendPosition.weight;
          distances[movedBendIndex] = relativeBendPosition.distance;

          edge.data('weights', weights);
          edge.data('distances', distances);
          
          clearDraws();
          renderBendShapes(edge);
        });
        
        cy.on('tapend', eTapEnd = function (event) {
          var edge = movedBendEdge;
          
          if (edge !== undefined && moveBendParam !== undefined && edge.data('weights')
                  && edge.data('weights').toString() != moveBendParam.weights.toString()) {
            
            if(options().undoable) {
              cy.undoRedo().do('changeBendPoints', moveBendParam);
            }
          }

          movedBendIndex = undefined;
          movedBendEdge = undefined;
          moveBendParam = undefined;

          resetGestures();
          clearDraws(true);
        });
        
        cy.on('cxttap', 'edge', eCxtTap = function (event) {
          var edge = this;
          var containerPos = $(cy.container()).position();

          var left = containerPos.left + event.cyRenderedPosition.x;
          left = left.toString() + 'px';

          var top = containerPos.top + event.cyRenderedPosition.y;
          top = top.toString() + 'px';

          $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');

          var selectedBendIndex = getContainingBendShapeIndex(event.cyPosition.x, event.cyPosition.y, edge);
          if (selectedBendIndex == -1) {
            $ctxAddBendPoint.css('display', 'block');
            bendPointUtilities.currentCtxPos = event.cyPosition;
            ctxMenu = document.getElementById("cy-edge-bend-editing-ctx-add-bend-point");
          }
          else {
            $ctxRemoveBendPoint.css('display', 'block');
            bendPointUtilities.currentBendIndex = selectedBendIndex;
            ctxMenu = document.getElementById("cy-edge-bend-editing-ctx-remove-bend-point");
          }

          ctxMenu.style.display = "block";
          ctxMenu.style.left = left;
          ctxMenu.style.top = top;

          bendPointUtilities.currentCtxEdge = edge;
        });
        
        cy.on('tap', eTap = function(event) {
          $('.cy-edge-bend-editing-ctx-operation').css('display', 'none');
        });
        
        cy.on('changeBendPoints', 'edge', function() {
          var edge = this;
          clearDraws();
          renderBendShapes(edge);
        });
        
      });

      $container.data('cyedgebendediting', data);
    },
    unbind: function () {
        cy.off('position', 'node', ePosition)
          .off('remove', 'node', eRemove)
          .off('select', 'edge', eSelect)
          .off('unselect', 'edge', eUnselect)
          .off('tapstart', 'edge', eTapStart)
          .off('tapdrag', eTapDrag)
          .off('tapend', eTapEnd)
          .off('cxttap', eCxtTap)
          .off('tap', eTap);

        cy.unbind("zoom pan", eZoom);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(this, Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(this, arguments);
  } else {
    $.error('No such function `' + fn + '` for cytoscape.js-edge-bend-editing');
  }

  return $(this);
};