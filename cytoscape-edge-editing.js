(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeEdgeEditing = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
var bendPointUtilities = _dereq_('./bendPointUtilities');
var reconnectionUtilities = _dereq_('./reconnectionUtilities');
var registerUndoRedoFunctions = _dereq_('./registerUndoRedoFunctions');

module.exports = function (params, cy) {
  var fn = params;

  var addBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-add-bend-point';
  var removeBendPointCxtMenuId = 'cy-edge-bend-editing-cxt-remove-bend-point';
  var eStyle, eRemove, eAdd, eZoom, eSelect, eUnselect, eTapStart, eTapDrag, eTapEnd, eCxtTap, eDrag;
  // last status of gestures
  var lastPanningEnabled, lastZoomingEnabled, lastBoxSelectionEnabled;
  // status of edge to highlight bends and selected edges
  var edgeToHighlightBends, numberOfSelectedEdges;
  
  var functions = {
    init: function () {
      // register undo redo functions
      registerUndoRedoFunctions(cy, bendPointUtilities, params);
      
      var self = this;
      var opts = params;
      var $container = $(this);
      var $canvas = $('<canvas></canvas>');

      $container.append($canvas);

      var cxtAddBendPointFcn = function (event) {
        var edge = event.target || event.cyTarget;
        if(!bendPointUtilities.isIgnoredEdge(edge)) {

          var param = {
            edge: edge,
            weights: edge.data('cyedgebendeditingWeights') ? [].concat(edge.data('cyedgebendeditingWeights')) : edge.data('cyedgebendeditingWeights'),
            distances: edge.data('cyedgebendeditingDistances') ? [].concat(edge.data('cyedgebendeditingDistances')) : edge.data('cyedgebendeditingDistances')
          };

          bendPointUtilities.addBendPoint();

          if (options().undoable) {
            cy.undoRedo().do('changeBendPoints', param);
          }
        }
        
        refreshDraws();
        edge.select();
      };

      var cxtRemoveBendPointFcn = function (event) {
        var edge = event.target || event.cyTarget;
        
        var param = {
          edge: edge,
          weights: [].concat(edge.data('cyedgebendeditingWeights')),
          distances: [].concat(edge.data('cyedgebendeditingDistances'))
        };

        bendPointUtilities.removeBendPoint();
        
        if(options().undoable) {
          cy.undoRedo().do('changeBendPoints', param);
        }
        
        setTimeout(function(){refreshDraws();edge.select();}, 50) ;

      };
      
      // function to reconnect edge
      var handleReconnectEdge = opts.handleReconnectEdge;
      // function to validate edge source and target on reconnection
      var validateEdge = opts.validateEdge; 
      // function to be called on invalid edge reconnection
      var actOnUnsuccessfulReconnection = opts.actOnUnsuccessfulReconnection;
      
      var menuItems = [
        {
          id: addBendPointCxtMenuId,
          title: opts.addBendMenuItemTitle,
          content: 'Add Bend Point',
          selector: 'edge',
          onClickFunction: cxtAddBendPointFcn
        },
        {
          id: removeBendPointCxtMenuId,
          title: opts.removeBendMenuItemTitle,
          content: 'Remove Bend Point',
          selector: 'edge',
          onClickFunction: cxtRemoveBendPointFcn
        }
      ];
      
      if(cy.contextMenus) {
        var menus = cy.contextMenus('get');
        // If context menus is active just append menu items else activate the extension
        // with initial menu items
        if (menus.isActive()) {
          menus.appendMenuItems(menuItems);
        }
        else {
          cy.contextMenus({
            menuItems: menuItems
          });
        }
      }
      
      var _sizeCanvas = debounce(function () {
        $canvas
          .attr('height', $container.height())
          .attr('width', $container.width())
          .css({
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': options().zIndex
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
            refreshDraws();
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
      
      function refreshDraws() {

        var w = $container.width();
        var h = $container.height();

        ctx.clearRect(0, 0, w, h);
        
        if( edgeToHighlightBends ) {
          renderBendShapes(edgeToHighlightBends);
          renderEndPointShapes(edgeToHighlightBends);
        }
      }
      
      // render the bend shapes of the given edge
      function renderBendShapes(edge) {
        
        if(!edge.hasClass('edgebendediting-hasbendpoints')) {
          return;
        }
        
        const segpts = bendPointUtilities.getSegmentPoints(edge);
        if (!segpts) {
          return;
        }

        const anchors = cy.data('cyedgebendeditingAnchors') || []
        for(let i = 0; segpts && i < segpts.length / 2; ++i) {
          if (anchors.length > i) {
            const anchor = anchors[i]
            anchor.restore()
            anchor.position({ x: segpts[i*2], y: segpts[i*2 + 1] })
          } else {
            anchors.push(cy.add({
              group: 'nodes',
              classes: ['anchor'],
              position: { x: segpts[i*2], y: segpts[i*2 + 1] },
              selectable: false
            }))
          }
        }
        anchors.slice(segpts.length / 2).forEach(anchor => {
          anchor.remove()
        })
        cy.data('cyedgebendeditingAnchors', anchors)
      }
      
      // render the end points shapes of the given edge
      function renderEndPointShapes(edge) {
        if(!edge){
          return;
        }

        var edge_pts = bendPointUtilities.getSegmentPoints(edge);
        if(typeof edge_pts === 'undefined'){
          edge_pts = [];
        }       
        var sourcePos = edge.sourceEndpoint();
        var targetPos = edge.targetEndpoint();
        edge_pts.unshift(sourcePos.y);
        edge_pts.unshift(sourcePos.x);
        edge_pts.push(targetPos.x);
        edge_pts.push(targetPos.y); 

       
        if(!edge_pts)
          return;

        var src = {
          x: edge_pts[0],
          y: edge_pts[1]
        }

        var target = {
          x: edge_pts[edge_pts.length-2],
          y: edge_pts[edge_pts.length-1]
        }

        var nextToSource = {
          x: edge_pts[2],
          y: edge_pts[3]
        }
        var nextToTarget = {
          x: edge_pts[edge_pts.length-4],
          y: edge_pts[edge_pts.length-3]
        }
        var length = getBendShapesLength(edge) * 0.65;

        var oldStroke = ctx.strokeStyle;
        var oldWidth = ctx.lineWidth;
        var oldFill = ctx.fillStyle;

        ctx.fillStyle = "#000"; // black
        
        renderEachEndPointShape(src, target, length,nextToSource,nextToTarget);
        
        ctx.strokeStyle = oldStroke;
        ctx.fillStyle = oldFill;
        ctx.lineWidth = oldWidth;
      }

      function renderEachEndPointShape(source, target, length,nextToSource,nextToTarget) {
        // get the top left coordinates of source and target
        var sTopLeftX = source.x - length / 2;
        var sTopLeftY = source.y - length / 2;

        var tTopLeftX = target.x - length / 2;
        var tTopLeftY = target.y - length / 2;

        var nextToSourceX = nextToSource.x - length /2;
        var nextToSourceY = nextToSource.y - length / 2;

        var nextToTargetX = nextToTarget.x - length /2;
        var nextToTargetY = nextToTarget.y - length /2;


        // convert to rendered parameters
        var renderedSourcePos = convertToRenderedPosition({x: sTopLeftX, y: sTopLeftY});
        var renderedTargetPos = convertToRenderedPosition({x: tTopLeftX, y: tTopLeftY});
        length = length * cy.zoom() / 2;

        var renderedNextToSource = convertToRenderedPosition({x: nextToSourceX, y: nextToSourceY});
        var renderedNextToTarget = convertToRenderedPosition({x: nextToTargetX, y: nextToTargetY});
        
        //how far to go from the node along the edge
        var distanceFromNode = length;

        var distanceSource = Math.sqrt(Math.pow(renderedNextToSource.x - renderedSourcePos.x,2) + Math.pow(renderedNextToSource.y - renderedSourcePos.y,2));        
        var sourceEndPointX = renderedSourcePos.x + ((distanceFromNode/ distanceSource)* (renderedNextToSource.x - renderedSourcePos.x));
        var sourceEndPointY = renderedSourcePos.y + ((distanceFromNode/ distanceSource)* (renderedNextToSource.y - renderedSourcePos.y));


        var distanceTarget = Math.sqrt(Math.pow(renderedNextToTarget.x - renderedTargetPos.x,2) + Math.pow(renderedNextToTarget.y - renderedTargetPos.y,2));        
        var targetEndPointX = renderedTargetPos.x + ((distanceFromNode/ distanceTarget)* (renderedNextToTarget.x - renderedTargetPos.x));
        var targetEndPointY = renderedTargetPos.y + ((distanceFromNode/ distanceTarget)* (renderedNextToTarget.y - renderedTargetPos.y)); 

        // render end point shape for source and target
        ctx.beginPath();
        ctx.arc(sourceEndPointX + length, sourceEndPointY + length, length, 0, 2*Math.PI, false);
        ctx.arc(targetEndPointX + length, targetEndPointY + length, length, 0, 2*Math.PI, false);
        ctx.fill();
        
        // drawDiamondShape(renderedSourcePos.x, renderedSourcePos.y, length);
        // drawDiamondShape(renderedTargetPos.x, renderedTargetPos.y, length);

        function drawDiamondShape(topLeftX, topLeftY, length){
          var l = (length) / (3 * 6 + 2);

          // Draw all corners
          drawCorner(topLeftX, topLeftY + length/2, l, 'left');
          drawCorner(topLeftX + length/2, topLeftY, l, 'top');
          drawCorner(topLeftX + length/2, topLeftY + length, l, 'bottom');
          drawCorner(topLeftX + length, topLeftY + length/2, l, 'right');

          drawDashedLine(topLeftX, topLeftY + length/2, topLeftX + length/2, topLeftY, l);
          drawDashedLine(topLeftX + length/2, topLeftY, topLeftX + length, topLeftY + length/2, l);
          drawDashedLine(topLeftX + length, topLeftY + length/2, topLeftX + length/2, topLeftY + length, l);
          drawDashedLine(topLeftX + length/2, topLeftY + length, topLeftX, topLeftY + length/2, l);
        }

        function drawCorner(x, y, l, corner){
          ctx.beginPath();
          ctx.moveTo(x, y);
          switch(corner){
            case 'left': {
              ctx.lineTo(x + l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x + l, y + l);
              break;
            }
            case 'top': {
              ctx.lineTo(x - l, y + l);
              ctx.lineTo(x, y);
              ctx.lineTo(x + l, y + l);
              break;
            }
            case 'right': {
              ctx.lineTo(x - l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x - l, y + l);
              break;
            }
            case 'bottom': {
              ctx.lineTo(x + l, y - l);
              ctx.lineTo(x, y);
              ctx.lineTo(x - l, y - l);
              break;
            }
            case 'default':
              return;
          }
          ctx.stroke();
        }

        function drawDashedLine(x1, y1, x2, y2, l){
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.setLineDash([2*l,l]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // changes color tone
      // https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
      function shadeBlend(p,c0,c1) {
        var n=p<0?p*-1:p,u=Math.round,w=parseInt;
        if(c0.length>7){
          var f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
          return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
        }
        else{
          var f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
          return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
        }
      }

      // get the length of bend points to be rendered
      function getBendShapesLength(edge) {
        var factor = options().bendShapeSizeFactor;
        if (parseFloat(edge.css('width')) <= 2.5)
          return 2.5 * factor;
        else return parseFloat(edge.css('width'))*factor;
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

      // get the index of bend point containing the point represented by {x, y}
      function getContainingBendShapeIndex(x, y, edge) {
        if(edge.data('cyedgebendeditingWeights') == null || edge.data('cyedgebendeditingWeights').length == 0){
          return -1;
        }

        var segpts = bendPointUtilities.getSegmentPoints(edge);//edge._private.rdata.segpts;
        var length = getBendShapesLength(edge);

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

      function getContainingEndPoint(x, y, edge){
        var length = getBendShapesLength(edge);
        var allPts = edge._private.rscratch.allpts;
        var src = {
          x: allPts[0],
          y: allPts[1]
        }
        var target = {
          x: allPts[allPts.length-2],
          y: allPts[allPts.length-1]
        }
        convertToRenderedPosition(src);
        convertToRenderedPosition(target);
        
        // Source:0, Target:1, None:-1
        if(checkIfInsideBendShape(x, y, length, src.x, src.y))
          return 0;
        else if(checkIfInsideBendShape(x, y, length, target.x, target.y))
          return 1;
        else
          return -1;
      }
      
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

      function moveBendPoints(positionDiff, edges) {
          edges.forEach(function( edge ){
              var previousBendPointsPosition = bendPointUtilities.getSegmentPoints(edge);
              var nextBendPointsPosition = [];
              if (previousBendPointsPosition != undefined)
              {
                for (i=0; i<previousBendPointsPosition.length; i+=2)
                {
                    nextBendPointsPosition.push({x: previousBendPointsPosition[i]+positionDiff.x, y: previousBendPointsPosition[i+1]+positionDiff.y});
                }
                edge.data('bendPointPositions',nextBendPointsPosition);
              }

          });
          bendPointUtilities.initBendPoints(options().bendPositionsFunction, edges);
          cy.trigger('bendPointMovement');
      }

      {  
        lastPanningEnabled = cy.panningEnabled();
        lastZoomingEnabled = cy.zoomingEnabled();
        lastBoxSelectionEnabled = cy.boxSelectionEnabled();
        
        // Initilize the edgeToHighlightBends and numberOfSelectedEdges
        {
          var selectedEdges = cy.edges(':selected');
          var numberOfSelectedEdges = selectedEdges.length;
          
          if ( numberOfSelectedEdges === 1 ) {
            edgeToHighlightBends = selectedEdges[0];
          }
        }
        
        cy.bind('zoom pan', eZoom = function () {
          if ( !edgeToHighlightBends ) {
            return;
          }
          
          refreshDraws();
        });

        cy.on('data', 'edge',  function () {
          if ( !edgeToHighlightBends ) {
            return;
          }
          
          refreshDraws();
        });

        /*  cy.on('position', 'node', ePosition = function () {
          var node = this;
          if(cy.edges(":selected").length  == 1){
            cy.edges().unselect()
          }        
          // If there is no edge to highlight bends or this node is not any end of that edge return directly
          if ( !edgeToHighlightBends || !( edgeToHighlightBends.data('source') === node.id() 
                  || edgeToHighlightBends.data('target') === node.id() ) ) {
            return;
          }
          
          refreshDraws(); 
        }); */
      /*   cy.on("afterUndo", function (event, actionName, args, res) {         
    
          if(actionName == "drag") {
          res.nodes.connectedEdges().unselect();          
          }
         
        }); */
        cy.on('style', 'edge.edgebendediting-hasbendpoints:selected', eStyle = function () {
          refreshDraws();
        });

        cy.on('remove', 'edge', eRemove = function () {
          var edge = this;
          if (edge.selected()) {
            numberOfSelectedEdges = numberOfSelectedEdges - 1;
            
            cy.startBatch();
            
            if (edgeToHighlightBends) {
              edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
            }
            
            if (numberOfSelectedEdges === 1) {
              var selectedEdges = cy.edges(':selected');
              
              // If user removes all selected edges at a single operation then our 'numberOfSelectedEdges'
              // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
              if (selectedEdges.length === 1) {
                edgeToHighlightBends = selectedEdges[0];
                edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
              }
              else {
                edgeToHighlightBends = undefined;
              }
            }
            else {
              edgeToHighlightBends = undefined;
            }
            
            cy.endBatch();
          }
          refreshDraws();
        });
        
         cy.on('add', 'edge', eAdd = function () {
          var edge = this;
          if (edge.selected()) {
            numberOfSelectedEdges = numberOfSelectedEdges + 1;
            
            cy.startBatch();
            
            if (edgeToHighlightBends) {
              edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
            }
            
            if (numberOfSelectedEdges === 1) {
              edgeToHighlightBends = edge;
              edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
            }
            else {
              edgeToHighlightBends = undefined;
            }
            
            cy.endBatch();
          }
          refreshDraws();
        });
        
        cy.on('select', 'edge', eSelect = function () {
          const edge = this;

          if(edge.target().connectedEdges().length == 0 || edge.source().connectedEdges().length == 0){
            return;
          }

         
          numberOfSelectedEdges = numberOfSelectedEdges + 1;
          
          cy.startBatch();
            
          if (edgeToHighlightBends) {
            edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
          }
            
          if (numberOfSelectedEdges === 1) {
            edgeToHighlightBends = edge;
            edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
          }
          else {
            edgeToHighlightBends = undefined;
          }
          
          cy.endBatch();
          refreshDraws();
        });
        
        cy.on('unselect', 'edge', eUnselect = function () {
          numberOfSelectedEdges = numberOfSelectedEdges - 1;
          let anchors = cy.data('cyedgebendeditingAnchors') || []
            
          cy.startBatch();
          anchors.forEach(anchor => {
            anchor.remove()
          })
            
          if (edgeToHighlightBends) {
            edgeToHighlightBends.removeClass('cy-edge-bend-editing-highlight-bends');
          }
            
          if (numberOfSelectedEdges === 1) {
            var selectedEdges = cy.edges(':selected');
            
            // If user unselects all edges by tapping to the core etc. then our 'numberOfSelectedEdges'
            // may be misleading. Therefore we need to check if the number of edges to highlight is realy 1 here.
            if (selectedEdges.length === 1) {
              edgeToHighlightBends = selectedEdges[0];
              edgeToHighlightBends.addClass('cy-edge-bend-editing-highlight-bends');
            }
            else {
              edgeToHighlightBends = undefined;
            }
          }
          else {
            edgeToHighlightBends = undefined;
          }
          
          cy.endBatch();
          refreshDraws();
        });
        
        var movedBendIndex;
        var movedBendEdge;
        var moveBendParam;
        var createBendOnDrag;
        var movedEndPoint;
        var dummyNode;
        var detachedNode;
        var nodeToAttach;
        
        cy.on('tapstart', 'edge, .anchor', eTapStart = function (event) {

          let index = -1;
          let endPoint;

          if (this.isNode()) {
            index = cy.data('cyedgebendeditingAnchors').findIndex(elem => elem.id() == this.id())
            movedBendEdge = edgeToHighlightBends;
          } else {
            const edge = this;

            if (!edgeToHighlightBends || edgeToHighlightBends.id() !== edge.id()) {
              createBendOnDrag = false;
              return;
            }
            
            movedBendEdge = edge;
            lastMovedEdge = edge;
            edge.unselect();
            moveBendParam = {
              edge: edge,
              weights: edge.data('cyedgebendeditingWeights') ? [].concat(edge.data('cyedgebendeditingWeights')) : [],
              distances: edge.data('cyedgebendeditingDistances') ? [].concat(edge.data('cyedgebendeditingDistances')) : []
            };
            
            const cyPos = event.position || event.cyPosition;
            const cyPosX = cyPos.x;
            const cyPosY = cyPos.y;

            // Get which end point has been clicked (Source:0, Target:1, None:-1)
            endPoint = getContainingEndPoint(cyPosX, cyPosY, edge);

            if(endPoint == 0 || endPoint == 1){
              movedEndPoint = endPoint;
              detachedNode = (endPoint == 0) ? movedBendEdge.source() : movedBendEdge.target();
  
              var disconnectedEnd = (endPoint == 0) ? 'source' : 'target';
              var result = reconnectionUtilities.disconnectEdge(movedBendEdge, cy, event.renderedPosition, disconnectedEnd);
              
              dummyNode = result.dummyNode;
              movedBendEdge = result.edge;
              index = -1;
  
              disableGestures();
              return;
            } else {
              index = getContainingBendShapeIndex(cyPosX, cyPosY, edge);
            }
          }
          
          if (index != -1) {
            movedBendIndex = index;
            disableGestures();
          } else {
            createBendOnDrag = true;
          }
        });
        
        cy.on('drag', 'node', eDrag = function (event) {
          if (this.hasClass('anchor')) {
            return
          }
          var node = this;
          cy.edges().unselect();
          if(!node.selected()){
            cy.nodes().unselect();
          }         
        });

        cy.on('tapdrag', eTapDrag = function (event) {
          var edge = movedBendEdge;
          if(movedBendEdge !== undefined && bendPointUtilities.isIgnoredEdge(edge) ) {
            return;
          }

          if(createBendOnDrag) {
            var cyPos = event.position || event.cyPosition;
            bendPointUtilities.addBendPoint(edge, cyPos);
            movedBendIndex = getContainingBendShapeIndex(cyPos.x, cyPos.y, edge);
            movedBendEdge = edge;
            createBendOnDrag = undefined;
            disableGestures();
          }
          
          if (movedBendEdge === undefined || (movedBendIndex === undefined && movedEndPoint === undefined)) {
            return;
          }

          // Update end point location (Source:0, Target:1)
          if(movedEndPoint != -1 && dummyNode){
            var newPos = event.position || event.cyPosition;
            dummyNode.position(newPos);
          }
          // Update bend point location
          else if(movedBendIndex != undefined){ 
            var weights = edge.data('cyedgebendeditingWeights');
            var distances = edge.data('cyedgebendeditingDistances');
            
            var relativeBendPosition = bendPointUtilities.convertToRelativeBendPosition(edge, event.position || event.cyPosition);
            weights[movedBendIndex] = relativeBendPosition.weight;
            distances[movedBendIndex] = relativeBendPosition.distance;
            
            edge.data('cyedgebendeditingWeights', weights);
            edge.data('cyedgebendeditingDistances', distances);
          }
          
          if(event.target && event.target[0] && event.target.isNode()){
            nodeToAttach = event.target;
          }

         
        });
        
        cy.on('tapend', eTapEnd = function (event) {
          let edge = movedBendEdge;

          if( edge !== undefined ) {

            if( movedBendIndex != undefined ) {
              var startX = edge.source().position('x');
              var startY = edge.source().position('y');
              var endX = edge.target().position('x');
              var endY = edge.target().position('y');
              
              var segPts = bendPointUtilities.getSegmentPoints(edge);
              var allPts = [startX, startY].concat(segPts).concat([endX, endY]);
              
              var pointIndex = movedBendIndex + 1;
              var preIndex = pointIndex - 1;
              var posIndex = pointIndex + 1;
              
              var point = {
                x: allPts[2 * pointIndex],
                y: allPts[2 * pointIndex + 1]
              };
              
              var prePoint = {
                x: allPts[2 * preIndex],
                y: allPts[2 * preIndex + 1]
              };
              
              var posPoint = {
                x: allPts[2 * posIndex],
                y: allPts[2 * posIndex + 1]
              };
              
              var nearToLine;
              
              if( ( point.x === prePoint.x && point.y === prePoint.y ) || ( point.x === prePoint.x && point.y === prePoint.y ) ) {
                nearToLine = true;
              }
              else {
                var m1 = ( prePoint.y - posPoint.y ) / ( prePoint.x - posPoint.x );
                var m2 = -1 / m1;

                var srcTgtPointsAndTangents = {
                  srcPoint: prePoint,
                  tgtPoint: posPoint,
                  m1: m1,
                  m2: m2
                };

                //get the intersection of the current segment with the new bend point
                var currentIntersection = bendPointUtilities.getIntersection(edge, point, srcTgtPointsAndTangents);
                var dist = Math.sqrt( Math.pow( (point.x - currentIntersection.x), 2 ) 
                        + Math.pow( (point.y - currentIntersection.y), 2 ));
                
                // var length = Math.sqrt( Math.pow( (posPoint.x - prePoint.x), 2 ) 
                //         + Math.pow( (posPoint.y - prePoint.y), 2 ));
                
                if( dist  < options().bendRemovalSensitivity ) {
                  nearToLine = true;
                }
                
              }
              
              if( nearToLine )
              {
                bendPointUtilities.removeBendPoint(edge, movedBendIndex);
              }
              
            }
            else if(dummyNode != undefined && (movedEndPoint == 0 || movedEndPoint == 1) ){
              
              var newNode = detachedNode;
              var isValid = 'valid';
              var location = (movedEndPoint == 0) ? 'source' : 'target';

              // validate edge reconnection
              if(nodeToAttach){
                var newSource = (movedEndPoint == 0) ? nodeToAttach : edge.source();
                var newTarget = (movedEndPoint == 1) ? nodeToAttach : edge.target();
                if(typeof validateEdge === "function")
                  isValid = validateEdge(edge, newSource, newTarget);
                newNode = (isValid === 'valid') ? nodeToAttach : detachedNode;
              }

              var newSource = (movedEndPoint == 0) ? newNode : edge.source();
              var newTarget = (movedEndPoint == 1) ? newNode : edge.target();
              edge = reconnectionUtilities.connectEdge(edge, detachedNode, location);

              if(detachedNode.id() !== newNode.id()){
                // use given handleReconnectEdge function 
                if(typeof handleReconnectEdge === 'function'){
                  var reconnectedEdge = handleReconnectEdge(newSource.id(), newTarget.id(), edge.data());
                  
                  if(reconnectedEdge){
                    reconnectionUtilities.copyEdge(edge, reconnectedEdge);
                    bendPointUtilities.initBendPoints(options().bendPositionsFunction, [reconnectedEdge]);
                  }
                  
                  if(reconnectedEdge && options().undoable){
                    var params = {
                      newEdge: reconnectedEdge,
                      oldEdge: edge
                    };
                    cy.undoRedo().do('removeReconnectedEdge', params);
                    edge = reconnectedEdge;
                  }
                  else if(reconnectedEdge){
                    cy.remove(edge);
                    edge = reconnectedEdge;
                  }
                }
                else{
                  var loc = (movedEndPoint == 0) ? {source: newNode.id()} : {target: newNode.id()};
                  var oldLoc = (movedEndPoint == 0) ? {source: detachedNode.id()} : {target: detachedNode.id()};
                  
                  if(options().undoable && newNode.id() !== detachedNode.id()) {
                    var param = {
                      edge: edge,
                      location: loc,
                      oldLoc: oldLoc
                    };
                    var result = cy.undoRedo().do('reconnectEdge', param);
                    edge = result.edge;
                    //edge.select();
                  }
                }  
              }

              // invalid edge reconnection callback
              if(isValid !== 'valid' && typeof actOnUnsuccessfulReconnection === 'function'){
                actOnUnsuccessfulReconnection();
              }
              edge.select();
              cy.remove(dummyNode);
            }

            movedBendEdge.select()
          }
          
          if (edge !== undefined && moveBendParam !== undefined && edge.data('cyedgebendeditingWeights')
          && edge.data('cyedgebendeditingWeights').toString() != moveBendParam.weights.toString()) {
            
            if(options().undoable) {
              cy.undoRedo().do('changeBendPoints', moveBendParam);
            }
          }
          

          movedBendIndex = undefined;
          movedBendEdge = undefined;
          moveBendParam = undefined;
          createBendOnDrag = undefined;
          movedEndPoint = undefined;
          dummyNode = undefined;
          detachedNode = undefined;
          nodeToAttach = undefined;

          resetGestures();
          setTimeout(function(){refreshDraws()}, 50);
        });

        //Variables used for starting and ending the movement of bend points with arrows
        var moveparam;
        var firstBendPoint;
        var edgeContainingFirstBendPoint;
        var firstBendPointFound;
        cy.on("edgebendediting.movestart", function (e, edges) {
            firstBendPointFound = false;
            if (edges[0] != undefined)
            {
                edges.forEach(function( edge ){
                  if (bendPointUtilities.getSegmentPoints(edge) != undefined && !firstBendPointFound)
                  {
                      firstBendPoint = { x: bendPointUtilities.getSegmentPoints(edge)[0], y: bendPointUtilities.getSegmentPoints(edge)[1]};
                      moveparam = {
                          firstTime: true,
                          firstBendPointPosition: {
                              x: firstBendPoint.x,
                              y: firstBendPoint.y
                          },
                          edges: edges
                      };
                      edgeContainingFirstBendPoint = edge;
                      firstBendPointFound = true;
                  }
                });
            }
        });

        cy.on("edgebendediting.moveend", function (e, edges) {
            if (moveparam != undefined)
            {
                var initialPos = moveparam.firstBendPointPosition;
                var movedFirstBendPoint = {
                    x: bendPointUtilities.getSegmentPoints(edgeContainingFirstBendPoint)[0],
                    y: bendPointUtilities.getSegmentPoints(edgeContainingFirstBendPoint)[1]
                };


                moveparam.positionDiff = {
                    x: -movedFirstBendPoint.x + initialPos.x,
                    y: -movedFirstBendPoint.y + initialPos.y
                }

                delete moveparam.firstBendPointPosition;

                if(options().undoable) {
                    cy.undoRedo().do("moveBendPoints", moveparam);
                }

                moveparam = undefined;
            }
        });

        cy.on('cxttap', 'edge', eCxtTap = function (event) {
          var edge = this;
          
          var menus = cy.contextMenus('get'); // get context menus instance
          
          if(!edgeToHighlightBends || edgeToHighlightBends.id() != edge.id() || bendPointUtilities.isIgnoredEdge(edge)) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.hideMenuItem(addBendPointCxtMenuId);
            return;
          }

          var cyPos = event.position || event.cyPosition;
          var selectedBendIndex = getContainingBendShapeIndex(cyPos.x, cyPos.y, edge);
          if (selectedBendIndex == -1) {
            menus.hideMenuItem(removeBendPointCxtMenuId);
            menus.showMenuItem(addBendPointCxtMenuId);
            bendPointUtilities.currentCtxPos = cyPos;
          }
          else {
            menus.hideMenuItem(addBendPointCxtMenuId);
            menus.showMenuItem(removeBendPointCxtMenuId);
            bendPointUtilities.currentBendIndex = selectedBendIndex;
          }

          bendPointUtilities.currentCtxEdge = edge;
        });
        
        cy.on('cyedgebendediting.changeBendPoints', 'edge', function() {
          var edge = this;
          cy.startBatch();
          // cy.edges().unselect(); 
          //edge.select();              
          cy.trigger('bendPointMovement');        
          cy.endBatch();          
          refreshDraws();
        
          
        });
      }

      var selectedEdges;
      var bendPointsMoving = false;

      function keyDown(e) {

          var shouldMove = typeof options().moveSelectedBendPointsOnKeyEvents === 'function'
              ? options().moveSelectedBendPointsOnKeyEvents() : options().moveSelectedBendPointsOnKeyEvents;

          if (!shouldMove) {
              return;
          }

          //Checks if the tagname is textarea or input
          var tn = document.activeElement.tagName;
          if (tn != "TEXTAREA" && tn != "INPUT")
          {
              switch(e.keyCode){
                  case 37: case 39: case 38:  case 40: // Arrow keys
                  case 32: e.preventDefault(); break; // Space
                  default: break; // do not block other keys
              }


              if (e.keyCode < '37' || e.keyCode > '40') {
                  return;
              }

              //Checks if only edges are selected (not any node) and if only 1 edge is selected
              //If the second checking is removed the bend points of multiple edges would move
              if (cy.edges(":selected").length != cy.elements(":selected").length || cy.edges(":selected").length != 1)
              {
                return;
              }

              if (!bendPointsMoving)
              {
                  selectedEdges = cy.edges(':selected');
                  cy.trigger("edgebendediting.movestart", [selectedEdges]);
                  bendPointsMoving = true;
              }
              if (e.altKey && e.which == '38') {
                  // up arrow and alt
                  moveBendPoints ({x:0, y:-1},selectedEdges);
              }
              else if (e.altKey && e.which == '40') {
                  // down arrow and alt
                  moveBendPoints ({x:0, y:1},selectedEdges);
              }
              else if (e.altKey && e.which == '37') {
                  // left arrow and alt
                  moveBendPoints ({x:-1, y:0},selectedEdges);
              }
              else if (e.altKey && e.which == '39') {
                  // right arrow and alt
                  moveBendPoints ({x:1, y:0},selectedEdges);
              }

              else if (e.shiftKey && e.which == '38') {
                  // up arrow and shift
                  moveBendPoints ({x:0, y:-10},selectedEdges);
              }
              else if (e.shiftKey && e.which == '40') {
                  // down arrow and shift
                  moveBendPoints ({x:0, y:10},selectedEdges);
              }
              else if (e.shiftKey && e.which == '37') {
                  // left arrow and shift
                  moveBendPoints ({x:-10, y:0},selectedEdges);

              }
              else if (e.shiftKey && e.which == '39' ) {
                  // right arrow and shift
                  moveBendPoints ({x:10, y:0},selectedEdges);
              }
              else if (e.keyCode == '38') {
                  // up arrow
                  moveBendPoints({x: 0, y: -3}, selectedEdges);
              }

              else if (e.keyCode == '40') {
                  // down arrow
                  moveBendPoints ({x:0, y:3},selectedEdges);
              }
              else if (e.keyCode == '37') {
                  // left arrow
                  moveBendPoints ({x:-3, y:0},selectedEdges);
              }
              else if (e.keyCode == '39') {
                  //right arrow
                  moveBendPoints ({x:3, y:0},selectedEdges);
              }
          }
      }
      function keyUp(e) {

          if (e.keyCode < '37' || e.keyCode > '40') {
              return;
          }

          var shouldMove = typeof options().moveSelectedBendPointsOnKeyEvents === 'function'
              ? options().moveSelectedBendPointsOnKeyEvents() : options().moveSelectedBendPointsOnKeyEvents;

          if (!shouldMove) {
              return;
          }

          cy.trigger("edgebendediting.moveend", [selectedEdges]);
          selectedEdges = undefined;
          bendPointsMoving = false;

      }
      document.addEventListener("keydown",keyDown, true);
      document.addEventListener("keyup",keyUp, true);

      $container.data('cyedgebendediting', data);
    },
    unbind: function () {
        cy.off('remove', 'node', eRemove)
          .off('add', 'node', eAdd)
          .off('style', 'edge.edgebendediting-hasbendpoints:selected', eStyle)
          .off('select', 'edge', eSelect)
          .off('unselect', 'edge', eUnselect)
          .off('tapstart', 'edge', eTapStart)
          .off('tapdrag', eTapDrag)
          .off('tapend', eTapEnd)
          .off('cxttap', eCxtTap)
          .off('drag', 'node',eDrag);

        cy.unbind("zoom pan", eZoom);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply($(cy.container()), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply($(cy.container()), arguments);
  } else {
    $.error('No such function `' + fn + '` for cytoscape.js-edge-editing');
  }

  return $(this);
};

},{"./bendPointUtilities":2,"./debounce":3,"./reconnectionUtilities":5,"./registerUndoRedoFunctions":6}],2:[function(_dereq_,module,exports){
var bendPointUtilities = {
  currentCtxEdge: undefined,
  currentCtxPos: undefined,
  currentBendIndex: undefined,
  ignoredClasses: undefined,
  setIgnoredClasses: function(_ignoredClasses) {
    this.ignoredClasses = _ignoredClasses;
  },
  // initilize bend points based on bendPositionsFcn
  initBendPoints: function(bendPositionsFcn, edges) {
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      if(!this.isIgnoredEdge(edge)) {

        // get the bend positions by applying the function for this edge
        var bendPositions = bendPositionsFcn.apply(this, edge);
        // calculate relative bend positions
        var result = this.convertToRelativeBendPositions(edge, bendPositions);

        // if there are bend points set weights and distances accordingly and add class to enable style changes
        if (result.distances.length > 0) {
          edge.data('cyedgebendeditingWeights', result.weights);
          edge.data('cyedgebendeditingDistances', result.distances);
          edge.addClass('edgebendediting-hasbendpoints');
        }
      }
    }
  },

  isIgnoredEdge: function(edge) {

    var startX = edge.source().position('x');
    var startY = edge.source().position('y');
    var endX = edge.target().position('x');
    var endY = edge.target().position('y');
   
    if((startX == endX && startY == endY)  || (edge.source().id() == edge.target().id())){
      return true;
    }
    for(var i = 0; this.ignoredClasses && i <  this.ignoredClasses.length; i++){
      if(edge.hasClass(this.ignoredClasses[i]))
        return true;
    }
    return false;
  },
  //Get the direction of the line from source point to the target point
  getLineDirection: function(srcPoint, tgtPoint){
    if(srcPoint.y == tgtPoint.y && srcPoint.x < tgtPoint.x){
      return 1;
    }
    if(srcPoint.y < tgtPoint.y && srcPoint.x < tgtPoint.x){
      return 2;
    }
    if(srcPoint.y < tgtPoint.y && srcPoint.x == tgtPoint.x){
      return 3;
    }
    if(srcPoint.y < tgtPoint.y && srcPoint.x > tgtPoint.x){
      return 4;
    }
    if(srcPoint.y == tgtPoint.y && srcPoint.x > tgtPoint.x){
      return 5;
    }
    if(srcPoint.y > tgtPoint.y && srcPoint.x > tgtPoint.x){
      return 6;
    }
    if(srcPoint.y > tgtPoint.y && srcPoint.x == tgtPoint.x){
      return 7;
    }
    return 8;//if srcPoint.y > tgtPoint.y and srcPoint.x < tgtPoint.x
  },
  getSrcTgtPointsAndTangents: function (edge) {
    var sourceNode = edge.source();
    var targetNode = edge.target();
    
    var tgtPosition = targetNode.position();
    var srcPosition = sourceNode.position();
    
    var srcPoint = sourceNode.position();
    var tgtPoint = targetNode.position();


    var m1 = (tgtPoint.y - srcPoint.y) / (tgtPoint.x - srcPoint.x);
    var m2 = -1 / m1;

    return {
      m1: m1,
      m2: m2,
      srcPoint: srcPoint,
      tgtPoint: tgtPoint
    };
  },
  getIntersection: function(edge, point, srcTgtPointsAndTangents){
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }

    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
    var m1 = srcTgtPointsAndTangents.m1;
    var m2 = srcTgtPointsAndTangents.m2;

    var intersectX;
    var intersectY;

    if(m1 == Infinity || m1 == -Infinity){
      intersectX = srcPoint.x;
      intersectY = point.y;
    }
    else if(m1 == 0){
      intersectX = point.x;
      intersectY = srcPoint.y;
    }
    else {
      var a1 = srcPoint.y - m1 * srcPoint.x;
      var a2 = point.y - m2 * point.x;

      intersectX = (a2 - a1) / (m1 - m2);
      intersectY = m1 * intersectX + a1;
    }

    //Intersection point is the intersection of the lines passing through the nodes and
    //passing through the bend point and perpendicular to the other line
    var intersectionPoint = {
      x: intersectX,
      y: intersectY
    };
    
    return intersectionPoint;
  },
  getSegmentPoints: function(edge) {
    
    var segpts = [];

    var segmentWs = edge.pstyle( 'segment-weights' ).pfValue;
    var segmentDs = edge.pstyle( 'segment-distances' ).pfValue;
    var segmentsN = Math.min( segmentWs.length, segmentDs.length );
    
    var srcPos = edge.source().position();
    var tgtPos = edge.target().position();

    var dy = ( tgtPos.y - srcPos.y );
    var dx = ( tgtPos.x - srcPos.x );
    
    var l = Math.sqrt( dx * dx + dy * dy );

    var vector = {
      x: dx,
      y: dy
    };

    var vectorNorm = {
      x: vector.x / l,
      y: vector.y / l
    };
    
    var vectorNormInverse = {
      x: -vectorNorm.y,
      y: vectorNorm.x
    };

    for( var s = 0; s < segmentsN; s++ ){
      var w = segmentWs[ s ];
      var d = segmentDs[ s ];

      // d = swappedDirection ? -d : d;
      //
      // d = Math.abs(d);

      // var w1 = !swappedDirection ? (1 - w) : w;
      // var w2 = !swappedDirection ? w : (1 - w);

      var w1 = (1 - w);
      var w2 = w;

      var posPts = {
        x1: srcPos.x,
        x2: tgtPos.x,
        y1: srcPos.y,
        y2: tgtPos.y
      };

      var midptPts = posPts;
      
      

      var adjustedMidpt = {
        x: midptPts.x1 * w1 + midptPts.x2 * w2,
        y: midptPts.y1 * w1 + midptPts.y2 * w2
      };

      segpts.push(
        adjustedMidpt.x + vectorNormInverse.x * d,
        adjustedMidpt.y + vectorNormInverse.y * d
      );
    }
    
    return segpts;
  },
  convertToRelativeBendPosition: function (edge, bendPoint, srcTgtPointsAndTangents) {
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }
    
    var intersectionPoint = this.getIntersection(edge, bendPoint, srcTgtPointsAndTangents);
    var intersectX = intersectionPoint.x;
    var intersectY = intersectionPoint.y;
    
    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
    
    var weight;
    
    if( intersectX != srcPoint.x ) {
      weight = (intersectX - srcPoint.x) / (tgtPoint.x - srcPoint.x);
    }
    else if( intersectY != srcPoint.y ) {
      weight = (intersectY - srcPoint.y) / (tgtPoint.y - srcPoint.y);
    }
    else {
      weight = 0;
    }
    
    var distance = Math.sqrt(Math.pow((intersectY - bendPoint.y), 2)
        + Math.pow((intersectX - bendPoint.x), 2));
    
    //Get the direction of the line form source point to target point
    var direction1 = this.getLineDirection(srcPoint, tgtPoint);
    //Get the direction of the line from intesection point to bend point
    var direction2 = this.getLineDirection(intersectionPoint, bendPoint);
    
    //If the difference is not -2 and not 6 then the direction of the distance is negative
    if(direction1 - direction2 != -2 && direction1 - direction2 != 6){
      if(distance != 0)
        distance = -1 * distance;
    }
    
    return {
      weight: weight,
      distance: distance
    };
  },
  convertToRelativeBendPositions: function (edge, bendPoints) {
    var srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
//    var bendPoints = edge.data('bendPointPositions');
    //output variables
    var weights = [];
    var distances = [];

    for (var i = 0; bendPoints && i < bendPoints.length; i++) {
      var bendPoint = bendPoints[i];
      var relativeBendPosition = this.convertToRelativeBendPosition(edge, bendPoint, srcTgtPointsAndTangents);

      weights.push(relativeBendPosition.weight);
      distances.push(relativeBendPosition.distance);
    }

    return {
      weights: weights,
      distances: distances
    };
  },
  getSegmentDistancesString: function (edge) {
    var str = "";

    var distances = edge.data('cyedgebendeditingDistances');
    for (var i = 0; distances && i < distances.length; i++) {
      str = str + " " + distances[i];
    }
    
    return str;
  },
  getSegmentWeightsString: function (edge) {
    var str = "";

    var weights = edge.data('cyedgebendeditingWeights');
    for (var i = 0; weights && i < weights.length; i++) {
      str = str + " " + weights[i];
    }
    
    return str;
  },
  addBendPoint: function(edge, newBendPoint) {
    if(edge === undefined || newBendPoint === undefined){
      edge = this.currentCtxEdge;
      newBendPoint = this.currentCtxPos;
    }
  
    var relativeBendPosition = this.convertToRelativeBendPosition(edge, newBendPoint);
    var originalPointWeight = relativeBendPosition.weight;
    
    var startX = edge.source().position('x');
    var startY = edge.source().position('y');
    var endX = edge.target().position('x');
    var endY = edge.target().position('y');
    var startWeight = this.convertToRelativeBendPosition(edge, {x: startX, y: startY}).weight;
    var endWeight = this.convertToRelativeBendPosition(edge, {x: endX, y: endY}).weight;
    var weightsWithTgtSrc = [startWeight].concat(edge.data('cyedgebendeditingWeights')?edge.data('cyedgebendeditingWeights'):[]).concat([endWeight]);
    
    var segPts = this.getSegmentPoints(edge);
    
    var minDist = Infinity;
    var intersection;
    var segptsWithTgtSrc = [startX, startY]
            .concat(segPts?segPts:[])
            .concat([endX, endY]);
    var newBendIndex = -1;
    
    for(var i = 0; i < weightsWithTgtSrc.length - 1; i++){
      var w1 = weightsWithTgtSrc[i];
      var w2 = weightsWithTgtSrc[i + 1];
      
      //check if the weight is between w1 and w2
      const b1 = this.compareWithPrecision(originalPointWeight, w1, true);
      const b2 = this.compareWithPrecision(originalPointWeight, w2);
      const b3 = this.compareWithPrecision(originalPointWeight, w2, true);
      const b4 = this.compareWithPrecision(originalPointWeight, w1);
      if( (b1 && b2) || (b3 && b4)){
        var startX = segptsWithTgtSrc[2 * i];
        var startY = segptsWithTgtSrc[2 * i + 1];
        var endX = segptsWithTgtSrc[2 * i + 2];
        var endY = segptsWithTgtSrc[2 * i + 3];
        
        var start = {
          x: startX,
          y: startY
        };
        
        var end = {
          x: endX,
          y: endY
        };
        
        var m1 = ( startY - endY ) / ( startX - endX );
        var m2 = -1 / m1;
        
        var srcTgtPointsAndTangents = {
          srcPoint: start,
          tgtPoint: end,
          m1: m1,
          m2: m2
        };
        
        //get the intersection of the current segment with the new bend point
        var currentIntersection = this.getIntersection(edge, newBendPoint, srcTgtPointsAndTangents);
        var dist = Math.sqrt( Math.pow( (newBendPoint.x - currentIntersection.x), 2 ) 
                + Math.pow( (newBendPoint.y - currentIntersection.y), 2 ));
        
        //Update the minimum distance
        if(dist < minDist){
          minDist = dist;
          intersection = currentIntersection;
          newBendIndex = i;
        }
      }
    }
    
    if(intersection !== undefined){
      newBendPoint = intersection;
    }
    
    relativeBendPosition = this.convertToRelativeBendPosition(edge, newBendPoint);
    
    if(intersection === undefined){
      relativeBendPosition.distance = 0;
    }

    var weights = edge.data('cyedgebendeditingWeights');
    var distances = edge.data('cyedgebendeditingDistances');
    
    weights = weights?weights:[];
    distances = distances?distances:[];
    
    if(weights.length === 0) {
      newBendIndex = 0;
    }
    
//    weights.push(relativeBendPosition.weight);
//    distances.push(relativeBendPosition.distance);
    if(newBendIndex != -1){
      weights.splice(newBendIndex, 0, relativeBendPosition.weight);
      distances.splice(newBendIndex, 0, relativeBendPosition.distance);
    }
   
    edge.data('cyedgebendeditingWeights', weights);
    edge.data('cyedgebendeditingDistances', distances);
    
    edge.addClass('edgebendediting-hasbendpoints');
    
    return relativeBendPosition;
  },
  removeBendPoint: function(edge, bendPointIndex){
    if(edge === undefined || bendPointIndex === undefined){
      edge = this.currentCtxEdge;
      bendPointIndex = this.currentBendIndex;
    }
    
    var distances = edge.data('cyedgebendeditingDistances');
    var weights = edge.data('cyedgebendeditingWeights');
    
    distances.splice(bendPointIndex, 1);
    weights.splice(bendPointIndex, 1);
    
    
    if(distances.length == 0 || weights.length == 0){
      edge.removeClass('edgebendediting-hasbendpoints');
        edge.data('cyedgebendeditingDistances', []);
        edge.data('cyedgebendeditingWeights', []);
    }
    else {
      edge.data('cyedgebendeditingDistances', distances);
      edge.data('cyedgebendeditingWeights', weights);
    }
  },
  calculateDistance: function(pt1, pt2) {
    var diffX = pt1.x - pt2.x;
    var diffY = pt1.y - pt2.y;
    
    var dist = Math.sqrt( Math.pow( diffX, 2 ) + Math.pow( diffY, 2 ) );
    return dist;
  },
  /** (Less than or equal to) and (greater then equal to) comparisons with floating point numbers */
  compareWithPrecision: function (n1, n2, isLessThenOrEqual = false, precision = 0.01) {
    const diff = n1 - n2;
    if (Math.abs(diff) <= precision) {
      return true;
    }
    if (isLessThenOrEqual) {
      return n1 < n2;
    } else {
      return n1 > n2;
    }
  }
};

module.exports = bendPointUtilities;

},{}],3:[function(_dereq_,module,exports){
var debounce = (function () {
  /**
   * lodash 3.1.1 (Custom Build) <https://lodash.com/>
   * Build: `lodash modern modularize exports="npm" -o ./`
   * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   * Available under MIT license <https://lodash.com/license>
   */
  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
          nativeNow = Date.now;

  /**
   * Gets the number of milliseconds that have elapsed since the Unix epoch
   * (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @category Date
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => logs the number of milliseconds it took for the deferred function to be invoked
   */
  var now = nativeNow || function () {
    return new Date().getTime();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed invocations. Provide an options object to indicate that `func`
   * should be invoked on the leading and/or trailing edge of the `wait` timeout.
   * Subsequent calls to the debounced function return the result of the last
   * `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
   * on the trailing edge of the timeout only if the the debounced function is
   * invoked more than once during the `wait` timeout.
   *
   * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.leading=false] Specify invoking on the leading
   *  edge of the timeout.
   * @param {number} [options.maxWait] The maximum time `func` is allowed to be
   *  delayed before it's invoked.
   * @param {boolean} [options.trailing=true] Specify invoking on the trailing
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // avoid costly calculations while the window size is in flux
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
   * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // ensure `batchLog` is invoked once after 1 second of debounced calls
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', _.debounce(batchLog, 250, {
   *   'maxWait': 1000
   * }));
   *
   * // cancel a debounced call
   * var todoChanges = _.debounce(batchLog, 1000);
   * Object.observe(models.todo, todoChanges);
   *
   * Object.observe(models, function(changes) {
   *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
   *     todoChanges.cancel();
   *   }
   * }, ['delete']);
   *
   * // ...at some point `models.todo` is changed
   * models.todo.completed = true;
   *
   * // ...before 1 second has passed `models.todo` is deleted
   * // which cancels the debounced `todoChanges` call
   * delete models.todo;
   */
  function debounce(func, wait, options) {
    var args,
            maxTimeoutId,
            result,
            stamp,
            thisArg,
            timeoutId,
            trailingCall,
            lastCalled = 0,
            maxWait = false,
            trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = wait < 0 ? 0 : (+wait || 0);
    if (options === true) {
      var leading = true;
      trailing = false;
    } else if (isObject(options)) {
      leading = !!options.leading;
      maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      lastCalled = 0;
      maxTimeoutId = timeoutId = trailingCall = undefined;
    }

    function complete(isCalled, id) {
      if (id) {
        clearTimeout(id);
      }
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
      }
    }

    function delayed() {
      var remaining = wait - (now() - stamp);
      if (remaining <= 0 || remaining > wait) {
        complete(trailingCall, maxTimeoutId);
      } else {
        timeoutId = setTimeout(delayed, remaining);
      }
    }

    function maxDelayed() {
      complete(trailing, timeoutId);
    }

    function debounced() {
      args = arguments;
      stamp = now();
      thisArg = this;
      trailingCall = trailing && (timeoutId || !leading);

      if (maxWait === false) {
        var leadingCall = leading && !timeoutId;
      } else {
        if (!maxTimeoutId && !leading) {
          lastCalled = stamp;
        }
        var remaining = maxWait - (stamp - lastCalled),
                isCalled = remaining <= 0 || remaining > maxWait;

        if (isCalled) {
          if (maxTimeoutId) {
            maxTimeoutId = clearTimeout(maxTimeoutId);
          }
          lastCalled = stamp;
          result = func.apply(thisArg, args);
        }
        else if (!maxTimeoutId) {
          maxTimeoutId = setTimeout(maxDelayed, remaining);
        }
      }
      if (isCalled && timeoutId) {
        timeoutId = clearTimeout(timeoutId);
      }
      else if (!timeoutId && wait !== maxWait) {
        timeoutId = setTimeout(delayed, wait);
      }
      if (leadingCall) {
        isCalled = true;
        result = func.apply(thisArg, args);
      }
      if (isCalled && !timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
      return result;
    }

    debounced.cancel = cancel;
    return debounced;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  return debounce;

})();

module.exports = debounce;
},{}],4:[function(_dereq_,module,exports){
;(function(){ 'use strict';
  
  var bendPointUtilities = _dereq_('./bendPointUtilities');
  var debounce = _dereq_("./debounce");
  
  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape, $ ){
    var uiUtilities = _dereq_('./UIUtilities');
    
    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    var defaults = {
      // this function specifies the poitions of bend points
      bendPositionsFunction: function(ele) {
        return ele.data('bendPointPositions');
      },
      // whether to initilize bend points on creation of this extension automatically
      initBendPointsAutomatically: true,
      // the classes of those edges that should be ignored
      ignoredClasses: [],
      // whether the bend editing operations are undoable (requires cytoscape-undo-redo.js)
      undoable: false,
      // the size of bend shape is obtained by multipling width of edge with this parameter
      bendShapeSizeFactor: 3,
      // z-index value of the canvas in which bend points are drawn
      zIndex: 999,      
      // whether to start the plugin in the enabled state
      enabled: true,
      //An option that controls the distance within which a bend point is considered "near" the line segment between its two neighbors and will be automatically removed
      bendRemovalSensitivity : 8,
      // title of add bend point menu item (User may need to adjust width of menu items according to length of this option)
      addBendMenuItemTitle: "Add Bend Point",
      // title of remove bend point menu item (User may need to adjust width of menu items according to length of this option)
      removeBendMenuItemTitle: "Remove Bend Point",
      // whether the bend point can be moved by arrows
      moveSelectedBendPointsOnKeyEvents: function () {
          return true;
      }
    };
    
    var options;
    var initialized = false;
    
    // Merge default options with the ones coming from parameter
    function extend(defaults, options) {
      var obj = {};

      for (var i in defaults) {
        obj[i] = defaults[i];
      }

      for (var i in options) {
        if(i == "bendRemovalSensitivity"){
          var value = options[i];
           if(!isNaN(value))
           {
              if(value >= 0 && value <= 20){
                obj[i] = options[i];
              }else if(value < 0){
                obj[i] = 0
              }else{
                obj[i] = 20
              }
           }
        }else{
          obj[i] = options[i];
        }

      }

      return obj;
    };
    
    cytoscape('core', 'edgeEditing', function(opts){
      var cy = this;
      
      if( opts === 'initialized' ) {
        return initialized;
      }
      
      if( opts !== 'get' ) {
        // merge the options with default ones
        options = extend(defaults, opts);
        initialized = true;

        // define edgebendediting-hasbendpoints css class
        cy.style().selector('.edgebendediting-hasbendpoints').css({
          'segment-distances': function (ele) {
            return bendPointUtilities.getSegmentDistancesString(ele);
          },
          'control-point-distances': function (ele) {
            return bendPointUtilities.getSegmentDistancesString(ele);
          },
          'segment-weights': function (ele) {
            return bendPointUtilities.getSegmentWeightsString(ele);
          },
          'control-point-weights': function (ele) {
            return bendPointUtilities.getSegmentWeightsString(ele);
          },
          'edge-distances': 'node-position'
        });

        bendPointUtilities.setIgnoredClasses(options.ignoredClasses);

        // init bend positions conditionally
        if (options.initBendPointsAutomatically) {
          bendPointUtilities.initBendPoints(options.bendPositionsFunction, cy.edges(), options.ignoredClasses);
        }

        if(options.enabled)
          uiUtilities(options, cy);
        else
          uiUtilities("unbind", cy);
      }
      
      var instance = initialized ? {
        /*
        * get segment points of the given edge in an array A,
        * A[2 * i] is the x coordinate and A[2 * i + 1] is the y coordinate
        * of the ith bend point. (Returns undefined if the curve style is not segments)
        */
        getSegmentPoints: function(ele) {
          return bendPointUtilities.getSegmentPoints(ele);
        },
        // Initilize bend points for the given edges using 'options.bendPositionsFunction'
        initBendPoints: function(eles) {
          bendPointUtilities.initBendPoints(options.bendPositionsFunction, eles);
        },
        deleteSelectedBendPoint: function(ele, index) {
          bendPointUtilities.removeBendPoint(ele,index);
        }
      } : undefined;

      return instance; // chainability
    } );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-edge-editing', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' && $ ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape, $ );
  }

})();

},{"./UIUtilities":1,"./bendPointUtilities":2,"./debounce":3}],5:[function(_dereq_,module,exports){
var reconnectionUtilities = {

    // creates and returns a dummy node which is connected to the disconnected edge
    disconnectEdge: function (edge, cy, position, disconnectedEnd) {
        
        var dummyNode = {
            data: { 
              id: 'nwt_reconnectEdge_dummy',
              ports: [],
            },
            style: {
              width: 1,
              height: 1,
              'visibility': 'hidden'
            },
            renderedPosition: position
        };
        cy.add(dummyNode);

        var loc = (disconnectedEnd === 'source') ? 
            {source: dummyNode.data.id} : 
            {target: dummyNode.data.id};

        edge = edge.move(loc)[0];

        return {
            dummyNode: cy.nodes("#" + dummyNode.data.id)[0],
            edge: edge
        };
    },

    connectEdge: function (edge, node, location) {
        if(!edge.isEdge() || !node.isNode())
            return;

        var loc = {};
        if(location === 'source')
            loc.source = node.id();
        
        else if(location === 'target')
            loc.target = node.id();
        
        else
            return;

        return edge.move(loc)[0];
    },

    copyEdge: function (oldEdge, newEdge) {
        this.copyBendPoints(oldEdge, newEdge);
        this.copyStyle(oldEdge, newEdge);
    },

    copyStyle: function (oldEdge, newEdge) {
        if(oldEdge && newEdge){
            newEdge.data('line-color', oldEdge.data('line-color'));
            newEdge.data('width', oldEdge.data('width'));
            newEdge.data('cardinality', oldEdge.data('cardinality'));
        }
    },

    copyBendPoints: function (oldEdge, newEdge) {
        if(oldEdge.hasClass('edgebendediting-hasbendpoints')){
            var bpDistances = oldEdge.data('cyedgebendeditingDistances');
            var bpWeights = oldEdge.data('cyedgebendeditingWeights');
            
            newEdge.data('cyedgebendeditingDistances', bpDistances);
            newEdge.data('cyedgebendeditingWeights', bpWeights);
            newEdge.addClass('edgebendediting-hasbendpoints');
        }
    },
};
  
module.exports = reconnectionUtilities;
  
},{}],6:[function(_dereq_,module,exports){
module.exports = function (cy, bendPointUtilities, params) {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({
    defaultActions: false,
    isDebug: true
  });

  function changeBendPoints(param) {
    var edge = cy.getElementById(param.edge.id());
    var result = {
      edge: edge,
      weights: param.set ? edge.data('cyedgebendeditingWeights') : param.weights,
      distances: param.set ? edge.data('cyedgebendeditingDistances') : param.distances,
      set: true//As the result will not be used for the first function call params should be used to set the data
    };

    var hasBend = param.weights && param.weights.length > 0;

    //Check if we need to set the weights and distances by the param values
    if (param.set) {
      hasBend ? edge.data('cyedgebendeditingWeights', param.weights) : edge.removeData('cyedgebendeditingWeights');
      hasBend ? edge.data('cyedgebendeditingDistances', param.distances) : edge.removeData('cyedgebendeditingDistances');

      //refresh the curve style as the number of bend point would be changed by the previous operation
      if (hasBend) {
        edge.addClass('edgebendediting-hasbendpoints');
      }
      else {
        edge.removeClass('edgebendediting-hasbendpoints');
      }
    }
    
    edge.trigger('cyedgebendediting.changeBendPoints');

    return result;
  }

  function moveDo(arg) {
      if (arg.firstTime) {
          delete arg.firstTime;
          return arg;
      }

      var edges = arg.edges;
      var positionDiff = arg.positionDiff;
      var result = {
          edges: edges,
          positionDiff: {
              x: -positionDiff.x,
              y: -positionDiff.y
          }
      };
      moveBendPointsUndoable(positionDiff, edges);

      return result;
  }

  function moveBendPointsUndoable(positionDiff, edges) {
      edges.forEach(function( edge ){
          edge = cy.getElementById(param.edge.id());
          var previousBendPointsPosition = bendPointUtilities.getSegmentPoints(edge);
          var nextBendPointsPosition = [];
          if (previousBendPointsPosition != undefined)
          {
              for (i=0; i<previousBendPointsPosition.length; i+=2)
              {
                  nextBendPointsPosition.push({x: previousBendPointsPosition[i]+positionDiff.x, y: previousBendPointsPosition[i+1]+positionDiff.y});
              }
              edge.data('bendPointPositions',nextBendPointsPosition);
          }
      });

      bendPointUtilities.initBendPoints(params.bendPositionsFunction, edges);
  }

  function reconnectEdge(param){
    var edge      = param.edge;
    var location  = param.location;
    var oldLoc    = param.oldLoc;

    edge = edge.move(location)[0];

    var result = {
      edge:     edge,
      location: oldLoc,
      oldLoc:   location
    }
    edge.unselect();
    return result;
  }

  function removeReconnectedEdge(param){
    var oldEdge = param.oldEdge;
    var tmp = cy.getElementById(oldEdge.data('id'));
    if(tmp && tmp.length > 0)
      oldEdge = tmp;

    var newEdge = param.newEdge;
    var tmp = cy.getElementById(newEdge.data('id'));
    if(tmp && tmp.length > 0)
      newEdge = tmp;

    if(oldEdge.inside()){
      oldEdge = oldEdge.remove()[0];
    } 
      
    if(newEdge.removed()){
      newEdge = newEdge.restore();
      newEdge.unselect();
    }
    
    return {
      oldEdge: newEdge,
      newEdge: oldEdge
    };
  }

  ur.action('changeBendPoints', changeBendPoints, changeBendPoints);
  ur.action('moveBendPoints', moveDo, moveDo);
  ur.action('reconnectEdge', reconnectEdge, reconnectEdge);
  ur.action('removeReconnectedEdge', removeReconnectedEdge, removeReconnectedEdge);
};

},{}]},{},[4])(4)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVUlVdGlsaXRpZXMuanMiLCJzcmMvYmVuZFBvaW50VXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3JlY29ubmVjdGlvblV0aWxpdGllcy5qcyIsInNyYy9yZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDanFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG52YXIgYmVuZFBvaW50VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9iZW5kUG9pbnRVdGlsaXRpZXMnKTtcbnZhciByZWNvbm5lY3Rpb25VdGlsaXRpZXMgPSByZXF1aXJlKCcuL3JlY29ubmVjdGlvblV0aWxpdGllcycpO1xudmFyIHJlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyVW5kb1JlZG9GdW5jdGlvbnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocGFyYW1zLCBjeSkge1xuICB2YXIgZm4gPSBwYXJhbXM7XG5cbiAgdmFyIGFkZEJlbmRQb2ludEN4dE1lbnVJZCA9ICdjeS1lZGdlLWJlbmQtZWRpdGluZy1jeHQtYWRkLWJlbmQtcG9pbnQnO1xuICB2YXIgcmVtb3ZlQmVuZFBvaW50Q3h0TWVudUlkID0gJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWN4dC1yZW1vdmUtYmVuZC1wb2ludCc7XG4gIHZhciBlU3R5bGUsIGVSZW1vdmUsIGVBZGQsIGVab29tLCBlU2VsZWN0LCBlVW5zZWxlY3QsIGVUYXBTdGFydCwgZVRhcERyYWcsIGVUYXBFbmQsIGVDeHRUYXAsIGVEcmFnO1xuICAvLyBsYXN0IHN0YXR1cyBvZiBnZXN0dXJlc1xuICB2YXIgbGFzdFBhbm5pbmdFbmFibGVkLCBsYXN0Wm9vbWluZ0VuYWJsZWQsIGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkO1xuICAvLyBzdGF0dXMgb2YgZWRnZSB0byBoaWdobGlnaHQgYmVuZHMgYW5kIHNlbGVjdGVkIGVkZ2VzXG4gIHZhciBlZGdlVG9IaWdobGlnaHRCZW5kcywgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzO1xuICBcbiAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyByZWdpc3RlciB1bmRvIHJlZG8gZnVuY3Rpb25zXG4gICAgICByZWdpc3RlclVuZG9SZWRvRnVuY3Rpb25zKGN5LCBiZW5kUG9pbnRVdGlsaXRpZXMsIHBhcmFtcyk7XG4gICAgICBcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBvcHRzID0gcGFyYW1zO1xuICAgICAgdmFyICRjb250YWluZXIgPSAkKHRoaXMpO1xuICAgICAgdmFyICRjYW52YXMgPSAkKCc8Y2FudmFzPjwvY2FudmFzPicpO1xuXG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcblxuICAgICAgdmFyIGN4dEFkZEJlbmRQb2ludEZjbiA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgZWRnZSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5jeVRhcmdldDtcbiAgICAgICAgaWYoIWJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XG5cbiAgICAgICAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgICAgd2VpZ2h0czogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpKSA6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyksXG4gICAgICAgICAgICBkaXN0YW5jZXM6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnKSA/IFtdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykpIDogZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5hZGRCZW5kUG9pbnQoKTtcblxuICAgICAgICAgIGlmIChvcHRpb25zKCkudW5kb2FibGUpIHtcbiAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgZWRnZS5zZWxlY3QoKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBjeHRSZW1vdmVCZW5kUG9pbnRGY24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGVkZ2UgPSBldmVudC50YXJnZXQgfHwgZXZlbnQuY3lUYXJnZXQ7XG4gICAgICAgIFxuICAgICAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgICAgZWRnZTogZWRnZSxcbiAgICAgICAgICB3ZWlnaHRzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSksXG4gICAgICAgICAgZGlzdGFuY2VzOiBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpKVxuICAgICAgICB9O1xuXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5yZW1vdmVCZW5kUG9pbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oJ2NoYW5nZUJlbmRQb2ludHMnLCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtyZWZyZXNoRHJhd3MoKTtlZGdlLnNlbGVjdCgpO30sIDUwKSA7XG5cbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHJlY29ubmVjdCBlZGdlXG4gICAgICB2YXIgaGFuZGxlUmVjb25uZWN0RWRnZSA9IG9wdHMuaGFuZGxlUmVjb25uZWN0RWRnZTtcbiAgICAgIC8vIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIGVkZ2Ugc291cmNlIGFuZCB0YXJnZXQgb24gcmVjb25uZWN0aW9uXG4gICAgICB2YXIgdmFsaWRhdGVFZGdlID0gb3B0cy52YWxpZGF0ZUVkZ2U7IFxuICAgICAgLy8gZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGludmFsaWQgZWRnZSByZWNvbm5lY3Rpb25cbiAgICAgIHZhciBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9IG9wdHMuYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb247XG4gICAgICBcbiAgICAgIHZhciBtZW51SXRlbXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogYWRkQmVuZFBvaW50Q3h0TWVudUlkLFxuICAgICAgICAgIHRpdGxlOiBvcHRzLmFkZEJlbmRNZW51SXRlbVRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQ6ICdBZGQgQmVuZCBQb2ludCcsXG4gICAgICAgICAgc2VsZWN0b3I6ICdlZGdlJyxcbiAgICAgICAgICBvbkNsaWNrRnVuY3Rpb246IGN4dEFkZEJlbmRQb2ludEZjblxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCxcbiAgICAgICAgICB0aXRsZTogb3B0cy5yZW1vdmVCZW5kTWVudUl0ZW1UaXRsZSxcbiAgICAgICAgICBjb250ZW50OiAnUmVtb3ZlIEJlbmQgUG9pbnQnLFxuICAgICAgICAgIHNlbGVjdG9yOiAnZWRnZScsXG4gICAgICAgICAgb25DbGlja0Z1bmN0aW9uOiBjeHRSZW1vdmVCZW5kUG9pbnRGY25cbiAgICAgICAgfVxuICAgICAgXTtcbiAgICAgIFxuICAgICAgaWYoY3kuY29udGV4dE1lbnVzKSB7XG4gICAgICAgIHZhciBtZW51cyA9IGN5LmNvbnRleHRNZW51cygnZ2V0Jyk7XG4gICAgICAgIC8vIElmIGNvbnRleHQgbWVudXMgaXMgYWN0aXZlIGp1c3QgYXBwZW5kIG1lbnUgaXRlbXMgZWxzZSBhY3RpdmF0ZSB0aGUgZXh0ZW5zaW9uXG4gICAgICAgIC8vIHdpdGggaW5pdGlhbCBtZW51IGl0ZW1zXG4gICAgICAgIGlmIChtZW51cy5pc0FjdGl2ZSgpKSB7XG4gICAgICAgICAgbWVudXMuYXBwZW5kTWVudUl0ZW1zKG1lbnVJdGVtcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY3kuY29udGV4dE1lbnVzKHtcbiAgICAgICAgICAgIG1lbnVJdGVtczogbWVudUl0ZW1zXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIF9zaXplQ2FudmFzID0gZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAkY2FudmFzXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICRjb250YWluZXIuaGVpZ2h0KCkpXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJGNvbnRhaW5lci53aWR0aCgpKVxuICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICd0b3AnOiAwLFxuICAgICAgICAgICAgJ2xlZnQnOiAwLFxuICAgICAgICAgICAgJ3otaW5kZXgnOiBvcHRpb25zKCkuekluZGV4XG4gICAgICAgICAgfSlcbiAgICAgICAgO1xuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBjYW52YXNCYiA9ICRjYW52YXMub2Zmc2V0KCk7XG4gICAgICAgICAgdmFyIGNvbnRhaW5lckJiID0gJGNvbnRhaW5lci5vZmZzZXQoKTtcblxuICAgICAgICAgICRjYW52YXNcbiAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAndG9wJzogLShjYW52YXNCYi50b3AgLSBjb250YWluZXJCYi50b3ApLFxuICAgICAgICAgICAgICAnbGVmdCc6IC0oY2FudmFzQmIubGVmdCAtIGNvbnRhaW5lckJiLmxlZnQpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIDtcblxuICAgICAgICAgIC8vIHJlZHJhdyBvbiBjYW52YXMgcmVzaXplXG4gICAgICAgICAgaWYoY3kpe1xuICAgICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcblxuICAgICAgfSwgMjUwKTtcblxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcbiAgICAgICAgX3NpemVDYW52YXMoKTtcbiAgICAgIH1cblxuICAgICAgc2l6ZUNhbnZhcygpO1xuXG4gICAgICAkKHdpbmRvdykuYmluZCgncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzaXplQ2FudmFzKCk7XG4gICAgICB9KTtcblxuICAgICAgdmFyIGN0eCA9ICRjYW52YXNbMF0uZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgLy8gd3JpdGUgb3B0aW9ucyB0byBkYXRhXG4gICAgICB2YXIgZGF0YSA9ICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnKTtcbiAgICAgIGlmIChkYXRhID09IG51bGwpIHtcbiAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgfVxuICAgICAgZGF0YS5vcHRpb25zID0gb3B0cztcblxuICAgICAgdmFyIG9wdENhY2hlO1xuXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gb3B0Q2FjaGUgfHwgKG9wdENhY2hlID0gJGNvbnRhaW5lci5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZycpLm9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICAvLyB3ZSB3aWxsIG5lZWQgdG8gY29udmVydCBtb2RlbCBwb3NpdG9ucyB0byByZW5kZXJlZCBwb3NpdGlvbnNcbiAgICAgIGZ1bmN0aW9uIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24obW9kZWxQb3NpdGlvbikge1xuICAgICAgICB2YXIgcGFuID0gY3kucGFuKCk7XG4gICAgICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgICAgIHZhciB4ID0gbW9kZWxQb3NpdGlvbi54ICogem9vbSArIHBhbi54O1xuICAgICAgICB2YXIgeSA9IG1vZGVsUG9zaXRpb24ueSAqIHpvb20gKyBwYW4ueTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgeTogeVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiByZWZyZXNoRHJhd3MoKSB7XG5cbiAgICAgICAgdmFyIHcgPSAkY29udGFpbmVyLndpZHRoKCk7XG4gICAgICAgIHZhciBoID0gJGNvbnRhaW5lci5oZWlnaHQoKTtcblxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xuICAgICAgICBcbiAgICAgICAgaWYoIGVkZ2VUb0hpZ2hsaWdodEJlbmRzICkge1xuICAgICAgICAgIHJlbmRlckJlbmRTaGFwZXMoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpO1xuICAgICAgICAgIHJlbmRlckVuZFBvaW50U2hhcGVzKGVkZ2VUb0hpZ2hsaWdodEJlbmRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyByZW5kZXIgdGhlIGJlbmQgc2hhcGVzIG9mIHRoZSBnaXZlbiBlZGdlXG4gICAgICBmdW5jdGlvbiByZW5kZXJCZW5kU2hhcGVzKGVkZ2UpIHtcbiAgICAgICAgXG4gICAgICAgIGlmKCFlZGdlLmhhc0NsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWdwdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcbiAgICAgICAgaWYgKCFzZWdwdHMpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhbmNob3JzID0gY3kuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdBbmNob3JzJykgfHwgW11cbiAgICAgICAgZm9yKGxldCBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoIC8gMjsgKytpKSB7XG4gICAgICAgICAgaWYgKGFuY2hvcnMubGVuZ3RoID4gaSkge1xuICAgICAgICAgICAgY29uc3QgYW5jaG9yID0gYW5jaG9yc1tpXVxuICAgICAgICAgICAgYW5jaG9yLnJlc3RvcmUoKVxuICAgICAgICAgICAgYW5jaG9yLnBvc2l0aW9uKHsgeDogc2VncHRzW2kqMl0sIHk6IHNlZ3B0c1tpKjIgKyAxXSB9KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmNob3JzLnB1c2goY3kuYWRkKHtcbiAgICAgICAgICAgICAgZ3JvdXA6ICdub2RlcycsXG4gICAgICAgICAgICAgIGNsYXNzZXM6IFsnYW5jaG9yJ10sXG4gICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHg6IHNlZ3B0c1tpKjJdLCB5OiBzZWdwdHNbaSoyICsgMV0gfSxcbiAgICAgICAgICAgICAgc2VsZWN0YWJsZTogZmFsc2VcbiAgICAgICAgICAgIH0pKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbmNob3JzLnNsaWNlKHNlZ3B0cy5sZW5ndGggLyAyKS5mb3JFYWNoKGFuY2hvciA9PiB7XG4gICAgICAgICAgYW5jaG9yLnJlbW92ZSgpXG4gICAgICAgIH0pXG4gICAgICAgIGN5LmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nQW5jaG9ycycsIGFuY2hvcnMpXG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHJlbmRlciB0aGUgZW5kIHBvaW50cyBzaGFwZXMgb2YgdGhlIGdpdmVuIGVkZ2VcbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVuZFBvaW50U2hhcGVzKGVkZ2UpIHtcbiAgICAgICAgaWYoIWVkZ2Upe1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlZGdlX3B0cyA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpO1xuICAgICAgICBpZih0eXBlb2YgZWRnZV9wdHMgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICBlZGdlX3B0cyA9IFtdO1xuICAgICAgICB9ICAgICAgIFxuICAgICAgICB2YXIgc291cmNlUG9zID0gZWRnZS5zb3VyY2VFbmRwb2ludCgpO1xuICAgICAgICB2YXIgdGFyZ2V0UG9zID0gZWRnZS50YXJnZXRFbmRwb2ludCgpO1xuICAgICAgICBlZGdlX3B0cy51bnNoaWZ0KHNvdXJjZVBvcy55KTtcbiAgICAgICAgZWRnZV9wdHMudW5zaGlmdChzb3VyY2VQb3MueCk7XG4gICAgICAgIGVkZ2VfcHRzLnB1c2godGFyZ2V0UG9zLngpO1xuICAgICAgICBlZGdlX3B0cy5wdXNoKHRhcmdldFBvcy55KTsgXG5cbiAgICAgICBcbiAgICAgICAgaWYoIWVkZ2VfcHRzKVxuICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgc3JjID0ge1xuICAgICAgICAgIHg6IGVkZ2VfcHRzWzBdLFxuICAgICAgICAgIHk6IGVkZ2VfcHRzWzFdXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC0yXSxcbiAgICAgICAgICB5OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtMV1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXh0VG9Tb3VyY2UgPSB7XG4gICAgICAgICAgeDogZWRnZV9wdHNbMl0sXG4gICAgICAgICAgeTogZWRnZV9wdHNbM11cbiAgICAgICAgfVxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0ID0ge1xuICAgICAgICAgIHg6IGVkZ2VfcHRzW2VkZ2VfcHRzLmxlbmd0aC00XSxcbiAgICAgICAgICB5OiBlZGdlX3B0c1tlZGdlX3B0cy5sZW5ndGgtM11cbiAgICAgICAgfVxuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKSAqIDAuNjU7XG5cbiAgICAgICAgdmFyIG9sZFN0cm9rZSA9IGN0eC5zdHJva2VTdHlsZTtcbiAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcbiAgICAgICAgdmFyIG9sZEZpbGwgPSBjdHguZmlsbFN0eWxlO1xuXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDBcIjsgLy8gYmxhY2tcbiAgICAgICAgXG4gICAgICAgIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNyYywgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCk7XG4gICAgICAgIFxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBvbGRTdHJva2U7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBvbGRGaWxsO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gb2xkV2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlbmRlckVhY2hFbmRQb2ludFNoYXBlKHNvdXJjZSwgdGFyZ2V0LCBsZW5ndGgsbmV4dFRvU291cmNlLG5leHRUb1RhcmdldCkge1xuICAgICAgICAvLyBnZXQgdGhlIHRvcCBsZWZ0IGNvb3JkaW5hdGVzIG9mIHNvdXJjZSBhbmQgdGFyZ2V0XG4gICAgICAgIHZhciBzVG9wTGVmdFggPSBzb3VyY2UueCAtIGxlbmd0aCAvIDI7XG4gICAgICAgIHZhciBzVG9wTGVmdFkgPSBzb3VyY2UueSAtIGxlbmd0aCAvIDI7XG5cbiAgICAgICAgdmFyIHRUb3BMZWZ0WCA9IHRhcmdldC54IC0gbGVuZ3RoIC8gMjtcbiAgICAgICAgdmFyIHRUb3BMZWZ0WSA9IHRhcmdldC55IC0gbGVuZ3RoIC8gMjtcblxuICAgICAgICB2YXIgbmV4dFRvU291cmNlWCA9IG5leHRUb1NvdXJjZS54IC0gbGVuZ3RoIC8yO1xuICAgICAgICB2YXIgbmV4dFRvU291cmNlWSA9IG5leHRUb1NvdXJjZS55IC0gbGVuZ3RoIC8gMjtcblxuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WCA9IG5leHRUb1RhcmdldC54IC0gbGVuZ3RoIC8yO1xuICAgICAgICB2YXIgbmV4dFRvVGFyZ2V0WSA9IG5leHRUb1RhcmdldC55IC0gbGVuZ3RoIC8yO1xuXG5cbiAgICAgICAgLy8gY29udmVydCB0byByZW5kZXJlZCBwYXJhbWV0ZXJzXG4gICAgICAgIHZhciByZW5kZXJlZFNvdXJjZVBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHNUb3BMZWZ0WCwgeTogc1RvcExlZnRZfSk7XG4gICAgICAgIHZhciByZW5kZXJlZFRhcmdldFBvcyA9IGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oe3g6IHRUb3BMZWZ0WCwgeTogdFRvcExlZnRZfSk7XG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCAqIGN5Lnpvb20oKSAvIDI7XG5cbiAgICAgICAgdmFyIHJlbmRlcmVkTmV4dFRvU291cmNlID0gY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbih7eDogbmV4dFRvU291cmNlWCwgeTogbmV4dFRvU291cmNlWX0pO1xuICAgICAgICB2YXIgcmVuZGVyZWROZXh0VG9UYXJnZXQgPSBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHt4OiBuZXh0VG9UYXJnZXRYLCB5OiBuZXh0VG9UYXJnZXRZfSk7XG4gICAgICAgIFxuICAgICAgICAvL2hvdyBmYXIgdG8gZ28gZnJvbSB0aGUgbm9kZSBhbG9uZyB0aGUgZWRnZVxuICAgICAgICB2YXIgZGlzdGFuY2VGcm9tTm9kZSA9IGxlbmd0aDtcblxuICAgICAgICB2YXIgZGlzdGFuY2VTb3VyY2UgPSBNYXRoLnNxcnQoTWF0aC5wb3cocmVuZGVyZWROZXh0VG9Tb3VyY2UueCAtIHJlbmRlcmVkU291cmNlUG9zLngsMikgKyBNYXRoLnBvdyhyZW5kZXJlZE5leHRUb1NvdXJjZS55IC0gcmVuZGVyZWRTb3VyY2VQb3MueSwyKSk7ICAgICAgICBcbiAgICAgICAgdmFyIHNvdXJjZUVuZFBvaW50WCA9IHJlbmRlcmVkU291cmNlUG9zLnggKyAoKGRpc3RhbmNlRnJvbU5vZGUvIGRpc3RhbmNlU291cmNlKSogKHJlbmRlcmVkTmV4dFRvU291cmNlLnggLSByZW5kZXJlZFNvdXJjZVBvcy54KSk7XG4gICAgICAgIHZhciBzb3VyY2VFbmRQb2ludFkgPSByZW5kZXJlZFNvdXJjZVBvcy55ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVNvdXJjZSkqIChyZW5kZXJlZE5leHRUb1NvdXJjZS55IC0gcmVuZGVyZWRTb3VyY2VQb3MueSkpO1xuXG5cbiAgICAgICAgdmFyIGRpc3RhbmNlVGFyZ2V0ID0gTWF0aC5zcXJ0KE1hdGgucG93KHJlbmRlcmVkTmV4dFRvVGFyZ2V0LnggLSByZW5kZXJlZFRhcmdldFBvcy54LDIpICsgTWF0aC5wb3cocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnksMikpOyAgICAgICAgXG4gICAgICAgIHZhciB0YXJnZXRFbmRQb2ludFggPSByZW5kZXJlZFRhcmdldFBvcy54ICsgKChkaXN0YW5jZUZyb21Ob2RlLyBkaXN0YW5jZVRhcmdldCkqIChyZW5kZXJlZE5leHRUb1RhcmdldC54IC0gcmVuZGVyZWRUYXJnZXRQb3MueCkpO1xuICAgICAgICB2YXIgdGFyZ2V0RW5kUG9pbnRZID0gcmVuZGVyZWRUYXJnZXRQb3MueSArICgoZGlzdGFuY2VGcm9tTm9kZS8gZGlzdGFuY2VUYXJnZXQpKiAocmVuZGVyZWROZXh0VG9UYXJnZXQueSAtIHJlbmRlcmVkVGFyZ2V0UG9zLnkpKTsgXG5cbiAgICAgICAgLy8gcmVuZGVyIGVuZCBwb2ludCBzaGFwZSBmb3Igc291cmNlIGFuZCB0YXJnZXRcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKHNvdXJjZUVuZFBvaW50WCArIGxlbmd0aCwgc291cmNlRW5kUG9pbnRZICsgbGVuZ3RoLCBsZW5ndGgsIDAsIDIqTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgICBjdHguYXJjKHRhcmdldEVuZFBvaW50WCArIGxlbmd0aCwgdGFyZ2V0RW5kUG9pbnRZICsgbGVuZ3RoLCBsZW5ndGgsIDAsIDIqTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gZHJhd0RpYW1vbmRTaGFwZShyZW5kZXJlZFNvdXJjZVBvcy54LCByZW5kZXJlZFNvdXJjZVBvcy55LCBsZW5ndGgpO1xuICAgICAgICAvLyBkcmF3RGlhbW9uZFNoYXBlKHJlbmRlcmVkVGFyZ2V0UG9zLngsIHJlbmRlcmVkVGFyZ2V0UG9zLnksIGxlbmd0aCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZHJhd0RpYW1vbmRTaGFwZSh0b3BMZWZ0WCwgdG9wTGVmdFksIGxlbmd0aCl7XG4gICAgICAgICAgdmFyIGwgPSAobGVuZ3RoKSAvICgzICogNiArIDIpO1xuXG4gICAgICAgICAgLy8gRHJhdyBhbGwgY29ybmVyc1xuICAgICAgICAgIGRyYXdDb3JuZXIodG9wTGVmdFgsIHRvcExlZnRZICsgbGVuZ3RoLzIsIGwsICdsZWZ0Jyk7XG4gICAgICAgICAgZHJhd0Nvcm5lcih0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSwgbCwgJ3RvcCcpO1xuICAgICAgICAgIGRyYXdDb3JuZXIodG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFkgKyBsZW5ndGgsIGwsICdib3R0b20nKTtcbiAgICAgICAgICBkcmF3Q29ybmVyKHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsLCAncmlnaHQnKTtcblxuICAgICAgICAgIGRyYXdEYXNoZWRMaW5lKHRvcExlZnRYLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCB0b3BMZWZ0WCArIGxlbmd0aC8yLCB0b3BMZWZ0WSwgbCk7XG4gICAgICAgICAgZHJhd0Rhc2hlZExpbmUodG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFksIHRvcExlZnRYICsgbGVuZ3RoLCB0b3BMZWZ0WSArIGxlbmd0aC8yLCBsKTtcbiAgICAgICAgICBkcmF3RGFzaGVkTGluZSh0b3BMZWZ0WCArIGxlbmd0aCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgdG9wTGVmdFggKyBsZW5ndGgvMiwgdG9wTGVmdFkgKyBsZW5ndGgsIGwpO1xuICAgICAgICAgIGRyYXdEYXNoZWRMaW5lKHRvcExlZnRYICsgbGVuZ3RoLzIsIHRvcExlZnRZICsgbGVuZ3RoLCB0b3BMZWZ0WCwgdG9wTGVmdFkgKyBsZW5ndGgvMiwgbCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkcmF3Q29ybmVyKHgsIHksIGwsIGNvcm5lcil7XG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgIGN0eC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgc3dpdGNoKGNvcm5lcil7XG4gICAgICAgICAgICBjYXNlICdsZWZ0Jzoge1xuICAgICAgICAgICAgICBjdHgubGluZVRvKHggKyBsLCB5IC0gbCk7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgKyBsKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICd0b3AnOiB7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgKyBsKTtcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4LCB5KTtcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4ICsgbCwgeSArIGwpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3JpZ2h0Jzoge1xuICAgICAgICAgICAgICBjdHgubGluZVRvKHggLSBsLCB5IC0gbCk7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgeSk7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCAtIGwsIHkgKyBsKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdib3R0b20nOiB7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oeCArIGwsIHkgLSBsKTtcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4LCB5KTtcbiAgICAgICAgICAgICAgY3R4LmxpbmVUbyh4IC0gbCwgeSAtIGwpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2RlZmF1bHQnOlxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYXdEYXNoZWRMaW5lKHgxLCB5MSwgeDIsIHkyLCBsKXtcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgY3R4Lm1vdmVUbyh4MSwgeTEpO1xuICAgICAgICAgIGN0eC5saW5lVG8oeDIsIHkyKTtcbiAgICAgICAgICBjdHguc2V0TGluZURhc2goWzIqbCxsXSk7XG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gY2hhbmdlcyBjb2xvciB0b25lXG4gICAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81NTYwMjQ4L3Byb2dyYW1tYXRpY2FsbHktbGlnaHRlbi1vci1kYXJrZW4tYS1oZXgtY29sb3Itb3ItcmdiLWFuZC1ibGVuZC1jb2xvcnNcbiAgICAgIGZ1bmN0aW9uIHNoYWRlQmxlbmQocCxjMCxjMSkge1xuICAgICAgICB2YXIgbj1wPDA/cCotMTpwLHU9TWF0aC5yb3VuZCx3PXBhcnNlSW50O1xuICAgICAgICBpZihjMC5sZW5ndGg+Nyl7XG4gICAgICAgICAgdmFyIGY9YzAuc3BsaXQoXCIsXCIpLHQ9KGMxP2MxOnA8MD9cInJnYigwLDAsMClcIjpcInJnYigyNTUsMjU1LDI1NSlcIikuc3BsaXQoXCIsXCIpLFI9dyhmWzBdLnNsaWNlKDQpKSxHPXcoZlsxXSksQj13KGZbMl0pO1xuICAgICAgICAgIHJldHVybiBcInJnYihcIisodSgodyh0WzBdLnNsaWNlKDQpKS1SKSpuKStSKStcIixcIisodSgodyh0WzFdKS1HKSpuKStHKStcIixcIisodSgodyh0WzJdKS1CKSpuKStCKStcIilcIlxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgdmFyIGY9dyhjMC5zbGljZSgxKSwxNiksdD13KChjMT9jMTpwPDA/XCIjMDAwMDAwXCI6XCIjRkZGRkZGXCIpLnNsaWNlKDEpLDE2KSxSMT1mPj4xNixHMT1mPj44JjB4MDBGRixCMT1mJjB4MDAwMEZGO1xuICAgICAgICAgIHJldHVybiBcIiNcIisoMHgxMDAwMDAwKyh1KCgodD4+MTYpLVIxKSpuKStSMSkqMHgxMDAwMCsodSgoKHQ+PjgmMHgwMEZGKS1HMSkqbikrRzEpKjB4MTAwKyh1KCgodCYweDAwMDBGRiktQjEpKm4pK0IxKSkudG9TdHJpbmcoMTYpLnNsaWNlKDEpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgYmVuZCBwb2ludHMgdG8gYmUgcmVuZGVyZWRcbiAgICAgIGZ1bmN0aW9uIGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSkge1xuICAgICAgICB2YXIgZmFjdG9yID0gb3B0aW9ucygpLmJlbmRTaGFwZVNpemVGYWN0b3I7XG4gICAgICAgIGlmIChwYXJzZUZsb2F0KGVkZ2UuY3NzKCd3aWR0aCcpKSA8PSAyLjUpXG4gICAgICAgICAgcmV0dXJuIDIuNSAqIGZhY3RvcjtcbiAgICAgICAgZWxzZSByZXR1cm4gcGFyc2VGbG9hdChlZGdlLmNzcygnd2lkdGgnKSkqZmFjdG9yO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBjaGVjayBpZiB0aGUgcG9pbnQgcmVwcmVzZW50ZWQgYnkge3gsIHl9IGlzIGluc2lkZSB0aGUgYmVuZCBzaGFwZVxuICAgICAgZnVuY3Rpb24gY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIGNlbnRlclgsIGNlbnRlclkpe1xuICAgICAgICB2YXIgbWluWCA9IGNlbnRlclggLSBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWF4WCA9IGNlbnRlclggKyBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWluWSA9IGNlbnRlclkgLSBsZW5ndGggLyAyO1xuICAgICAgICB2YXIgbWF4WSA9IGNlbnRlclkgKyBsZW5ndGggLyAyO1xuICAgICAgICBcbiAgICAgICAgdmFyIGluc2lkZSA9ICh4ID49IG1pblggJiYgeCA8PSBtYXhYKSAmJiAoeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSk7XG4gICAgICAgIHJldHVybiBpbnNpZGU7XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgaW5kZXggb2YgYmVuZCBwb2ludCBjb250YWluaW5nIHRoZSBwb2ludCByZXByZXNlbnRlZCBieSB7eCwgeX1cbiAgICAgIGZ1bmN0aW9uIGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleCh4LCB5LCBlZGdlKSB7XG4gICAgICAgIGlmKGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgPT0gbnVsbCB8fCBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VncHRzID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7Ly9lZGdlLl9wcml2YXRlLnJkYXRhLnNlZ3B0cztcbiAgICAgICAgdmFyIGxlbmd0aCA9IGdldEJlbmRTaGFwZXNMZW5ndGgoZWRnZSk7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgc2VncHRzICYmIGkgPCBzZWdwdHMubGVuZ3RoOyBpID0gaSArIDIpe1xuICAgICAgICAgIHZhciBiZW5kWCA9IHNlZ3B0c1tpXTtcbiAgICAgICAgICB2YXIgYmVuZFkgPSBzZWdwdHNbaSArIDFdO1xuXG4gICAgICAgICAgdmFyIGluc2lkZSA9IGNoZWNrSWZJbnNpZGVCZW5kU2hhcGUoeCwgeSwgbGVuZ3RoLCBiZW5kWCwgYmVuZFkpO1xuICAgICAgICAgIGlmKGluc2lkZSl7XG4gICAgICAgICAgICByZXR1cm4gaSAvIDI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gZ2V0Q29udGFpbmluZ0VuZFBvaW50KHgsIHksIGVkZ2Upe1xuICAgICAgICB2YXIgbGVuZ3RoID0gZ2V0QmVuZFNoYXBlc0xlbmd0aChlZGdlKTtcbiAgICAgICAgdmFyIGFsbFB0cyA9IGVkZ2UuX3ByaXZhdGUucnNjcmF0Y2guYWxscHRzO1xuICAgICAgICB2YXIgc3JjID0ge1xuICAgICAgICAgIHg6IGFsbFB0c1swXSxcbiAgICAgICAgICB5OiBhbGxQdHNbMV1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGFyZ2V0ID0ge1xuICAgICAgICAgIHg6IGFsbFB0c1thbGxQdHMubGVuZ3RoLTJdLFxuICAgICAgICAgIHk6IGFsbFB0c1thbGxQdHMubGVuZ3RoLTFdXG4gICAgICAgIH1cbiAgICAgICAgY29udmVydFRvUmVuZGVyZWRQb3NpdGlvbihzcmMpO1xuICAgICAgICBjb252ZXJ0VG9SZW5kZXJlZFBvc2l0aW9uKHRhcmdldCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3VyY2U6MCwgVGFyZ2V0OjEsIE5vbmU6LTFcbiAgICAgICAgaWYoY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIHNyYy54LCBzcmMueSkpXG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIGVsc2UgaWYoY2hlY2tJZkluc2lkZUJlbmRTaGFwZSh4LCB5LCBsZW5ndGgsIHRhcmdldC54LCB0YXJnZXQueSkpXG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBnZXN0dXJlcyBhbmQgc2V0IHRoZW0gdG8gZmFsc2VcbiAgICAgIGZ1bmN0aW9uIGRpc2FibGVHZXN0dXJlcygpIHtcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XG5cbiAgICAgICAgY3kuem9vbWluZ0VuYWJsZWQoZmFsc2UpXG4gICAgICAgICAgLnBhbm5pbmdFbmFibGVkKGZhbHNlKVxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gcmVzZXQgdGhlIGdlc3R1cmVzIGJ5IHRoZWlyIGxhdGVzdCBzdGF0dXNcbiAgICAgIGZ1bmN0aW9uIHJlc2V0R2VzdHVyZXMoKSB7XG4gICAgICAgIGN5Lnpvb21pbmdFbmFibGVkKGxhc3Rab29taW5nRW5hYmxlZClcbiAgICAgICAgICAucGFubmluZ0VuYWJsZWQobGFzdFBhbm5pbmdFbmFibGVkKVxuICAgICAgICAgIC5ib3hTZWxlY3Rpb25FbmFibGVkKGxhc3RCb3hTZWxlY3Rpb25FbmFibGVkKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbW92ZUJlbmRQb2ludHMocG9zaXRpb25EaWZmLCBlZGdlcykge1xuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcbiAgICAgICAgICAgICAgdmFyIHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uID0gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZSk7XG4gICAgICAgICAgICAgIHZhciBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uID0gW107XG4gICAgICAgICAgICAgIGlmIChwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBuZXh0QmVuZFBvaW50c1Bvc2l0aW9uLnB1c2goe3g6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2ldK3Bvc2l0aW9uRGlmZi54LCB5OiBwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbltpKzFdK3Bvc2l0aW9uRGlmZi55fSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVkZ2UuZGF0YSgnYmVuZFBvaW50UG9zaXRpb25zJyxuZXh0QmVuZFBvaW50c1Bvc2l0aW9uKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVkZ2VzKTtcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpO1xuICAgICAgfVxuXG4gICAgICB7ICBcbiAgICAgICAgbGFzdFBhbm5pbmdFbmFibGVkID0gY3kucGFubmluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdFpvb21pbmdFbmFibGVkID0gY3kuem9vbWluZ0VuYWJsZWQoKTtcbiAgICAgICAgbGFzdEJveFNlbGVjdGlvbkVuYWJsZWQgPSBjeS5ib3hTZWxlY3Rpb25FbmFibGVkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWxpemUgdGhlIGVkZ2VUb0hpZ2hsaWdodEJlbmRzIGFuZCBudW1iZXJPZlNlbGVjdGVkRWRnZXNcbiAgICAgICAge1xuICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xuICAgICAgICAgIHZhciBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBzZWxlY3RlZEVkZ2VzLmxlbmd0aDtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoIG51bWJlck9mU2VsZWN0ZWRFZGdlcyA9PT0gMSApIHtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gc2VsZWN0ZWRFZGdlc1swXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGN5LmJpbmQoJ3pvb20gcGFuJywgZVpvb20gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0QmVuZHMgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIHJlZnJlc2hEcmF3cygpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjeS5vbignZGF0YScsICdlZGdlJywgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoICFlZGdlVG9IaWdobGlnaHRCZW5kcyApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qICBjeS5vbigncG9zaXRpb24nLCAnbm9kZScsIGVQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgICAgICAgaWYoY3kuZWRnZXMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoICA9PSAxKXtcbiAgICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKVxuICAgICAgICAgIH0gICAgICAgIFxuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGVkZ2UgdG8gaGlnaGxpZ2h0IGJlbmRzIG9yIHRoaXMgbm9kZSBpcyBub3QgYW55IGVuZCBvZiB0aGF0IGVkZ2UgcmV0dXJuIGRpcmVjdGx5XG4gICAgICAgICAgaWYgKCAhZWRnZVRvSGlnaGxpZ2h0QmVuZHMgfHwgISggZWRnZVRvSGlnaGxpZ2h0QmVuZHMuZGF0YSgnc291cmNlJykgPT09IG5vZGUuaWQoKSBcbiAgICAgICAgICAgICAgICAgIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmRhdGEoJ3RhcmdldCcpID09PSBub2RlLmlkKCkgKSApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7IFxuICAgICAgICB9KTsgKi9cbiAgICAgIC8qICAgY3kub24oXCJhZnRlclVuZG9cIiwgZnVuY3Rpb24gKGV2ZW50LCBhY3Rpb25OYW1lLCBhcmdzLCByZXMpIHsgICAgICAgICBcbiAgICBcbiAgICAgICAgICBpZihhY3Rpb25OYW1lID09IFwiZHJhZ1wiKSB7XG4gICAgICAgICAgcmVzLm5vZGVzLmNvbm5lY3RlZEVkZ2VzKCkudW5zZWxlY3QoKTsgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgICAgXG4gICAgICAgIH0pOyAqL1xuICAgICAgICBjeS5vbignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kub24oJ3JlbW92ZScsICdlZGdlJywgZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzIC0gMTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gSWYgdXNlciByZW1vdmVzIGFsbCBzZWxlY3RlZCBlZGdlcyBhdCBhIHNpbmdsZSBvcGVyYXRpb24gdGhlbiBvdXIgJ251bWJlck9mU2VsZWN0ZWRFZGdlcydcbiAgICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cbiAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkRWRnZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMgPSBzZWxlY3RlZEVkZ2VzWzBdO1xuICAgICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAgY3kub24oJ2FkZCcsICdlZGdlJywgZUFkZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IHRoaXM7XG4gICAgICAgICAgaWYgKGVkZ2Uuc2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID0gbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzICsgMTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY3kuc3RhcnRCYXRjaCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gZWRnZTtcbiAgICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMuYWRkQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjeS5lbmRCYXRjaCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbignc2VsZWN0JywgJ2VkZ2UnLCBlU2VsZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnN0IGVkZ2UgPSB0aGlzO1xuXG4gICAgICAgICAgaWYoZWRnZS50YXJnZXQoKS5jb25uZWN0ZWRFZGdlcygpLmxlbmd0aCA9PSAwIHx8IGVkZ2Uuc291cmNlKCkuY29ubmVjdGVkRWRnZXMoKS5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICBcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgKyAxO1xuICAgICAgICAgIFxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgIGlmIChlZGdlVG9IaWdobGlnaHRCZW5kcykge1xuICAgICAgICAgICAgZWRnZVRvSGlnaGxpZ2h0QmVuZHMucmVtb3ZlQ2xhc3MoJ2N5LWVkZ2UtYmVuZC1lZGl0aW5nLWhpZ2hsaWdodC1iZW5kcycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgIGlmIChudW1iZXJPZlNlbGVjdGVkRWRnZXMgPT09IDEpIHtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzID0gZWRnZTtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBudW1iZXJPZlNlbGVjdGVkRWRnZXMgPSBudW1iZXJPZlNlbGVjdGVkRWRnZXMgLSAxO1xuICAgICAgICAgIGxldCBhbmNob3JzID0gY3kuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdBbmNob3JzJykgfHwgW11cbiAgICAgICAgICAgIFxuICAgICAgICAgIGN5LnN0YXJ0QmF0Y2goKTtcbiAgICAgICAgICBhbmNob3JzLmZvckVhY2goYW5jaG9yID0+IHtcbiAgICAgICAgICAgIGFuY2hvci5yZW1vdmUoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgICBpZiAoZWRnZVRvSGlnaGxpZ2h0QmVuZHMpIHtcbiAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLnJlbW92ZUNsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICBpZiAobnVtYmVyT2ZTZWxlY3RlZEVkZ2VzID09PSAxKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRFZGdlcyA9IGN5LmVkZ2VzKCc6c2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgdXNlciB1bnNlbGVjdHMgYWxsIGVkZ2VzIGJ5IHRhcHBpbmcgdG8gdGhlIGNvcmUgZXRjLiB0aGVuIG91ciAnbnVtYmVyT2ZTZWxlY3RlZEVkZ2VzJ1xuICAgICAgICAgICAgLy8gbWF5IGJlIG1pc2xlYWRpbmcuIFRoZXJlZm9yZSB3ZSBuZWVkIHRvIGNoZWNrIGlmIHRoZSBudW1iZXIgb2YgZWRnZXMgdG8gaGlnaGxpZ2h0IGlzIHJlYWx5IDEgaGVyZS5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZEVkZ2VzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHNlbGVjdGVkRWRnZXNbMF07XG4gICAgICAgICAgICAgIGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmFkZENsYXNzKCdjeS1lZGdlLWJlbmQtZWRpdGluZy1oaWdobGlnaHQtYmVuZHMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlZGdlVG9IaWdobGlnaHRCZW5kcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTtcbiAgICAgICAgICByZWZyZXNoRHJhd3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgbW92ZWRCZW5kSW5kZXg7XG4gICAgICAgIHZhciBtb3ZlZEJlbmRFZGdlO1xuICAgICAgICB2YXIgbW92ZUJlbmRQYXJhbTtcbiAgICAgICAgdmFyIGNyZWF0ZUJlbmRPbkRyYWc7XG4gICAgICAgIHZhciBtb3ZlZEVuZFBvaW50O1xuICAgICAgICB2YXIgZHVtbXlOb2RlO1xuICAgICAgICB2YXIgZGV0YWNoZWROb2RlO1xuICAgICAgICB2YXIgbm9kZVRvQXR0YWNoO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ3RhcHN0YXJ0JywgJ2VkZ2UsIC5hbmNob3InLCBlVGFwU3RhcnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgIGxldCBpbmRleCA9IC0xO1xuICAgICAgICAgIGxldCBlbmRQb2ludDtcblxuICAgICAgICAgIGlmICh0aGlzLmlzTm9kZSgpKSB7XG4gICAgICAgICAgICBpbmRleCA9IGN5LmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nQW5jaG9ycycpLmZpbmRJbmRleChlbGVtID0+IGVsZW0uaWQoKSA9PSB0aGlzLmlkKCkpXG4gICAgICAgICAgICBtb3ZlZEJlbmRFZGdlID0gZWRnZVRvSGlnaGxpZ2h0QmVuZHM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVkZ2UgPSB0aGlzO1xuXG4gICAgICAgICAgICBpZiAoIWVkZ2VUb0hpZ2hsaWdodEJlbmRzIHx8IGVkZ2VUb0hpZ2hsaWdodEJlbmRzLmlkKCkgIT09IGVkZ2UuaWQoKSkge1xuICAgICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gZmFsc2U7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IGVkZ2U7XG4gICAgICAgICAgICBsYXN0TW92ZWRFZGdlID0gZWRnZTtcbiAgICAgICAgICAgIGVkZ2UudW5zZWxlY3QoKTtcbiAgICAgICAgICAgIG1vdmVCZW5kUGFyYW0gPSB7XG4gICAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXG4gICAgICAgICAgICAgIHdlaWdodHM6IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKSkgOiBbXSxcbiAgICAgICAgICAgICAgZGlzdGFuY2VzOiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykgPyBbXS5jb25jYXQoZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpKSA6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XG4gICAgICAgICAgICBjb25zdCBjeVBvc1ggPSBjeVBvcy54O1xuICAgICAgICAgICAgY29uc3QgY3lQb3NZID0gY3lQb3MueTtcblxuICAgICAgICAgICAgLy8gR2V0IHdoaWNoIGVuZCBwb2ludCBoYXMgYmVlbiBjbGlja2VkIChTb3VyY2U6MCwgVGFyZ2V0OjEsIE5vbmU6LTEpXG4gICAgICAgICAgICBlbmRQb2ludCA9IGdldENvbnRhaW5pbmdFbmRQb2ludChjeVBvc1gsIGN5UG9zWSwgZWRnZSk7XG5cbiAgICAgICAgICAgIGlmKGVuZFBvaW50ID09IDAgfHwgZW5kUG9pbnQgPT0gMSl7XG4gICAgICAgICAgICAgIG1vdmVkRW5kUG9pbnQgPSBlbmRQb2ludDtcbiAgICAgICAgICAgICAgZGV0YWNoZWROb2RlID0gKGVuZFBvaW50ID09IDApID8gbW92ZWRCZW5kRWRnZS5zb3VyY2UoKSA6IG1vdmVkQmVuZEVkZ2UudGFyZ2V0KCk7XG4gIFxuICAgICAgICAgICAgICB2YXIgZGlzY29ubmVjdGVkRW5kID0gKGVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29ubmVjdGlvblV0aWxpdGllcy5kaXNjb25uZWN0RWRnZShtb3ZlZEJlbmRFZGdlLCBjeSwgZXZlbnQucmVuZGVyZWRQb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGR1bW15Tm9kZSA9IHJlc3VsdC5kdW1teU5vZGU7XG4gICAgICAgICAgICAgIG1vdmVkQmVuZEVkZ2UgPSByZXN1bHQuZWRnZTtcbiAgICAgICAgICAgICAgaW5kZXggPSAtMTtcbiAgXG4gICAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvc1gsIGN5UG9zWSwgZWRnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIGRpc2FibGVHZXN0dXJlcygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ2RyYWcnLCAnbm9kZScsIGVEcmFnID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoJ2FuY2hvcicpKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xuICAgICAgICAgIGN5LmVkZ2VzKCkudW5zZWxlY3QoKTtcbiAgICAgICAgICBpZighbm9kZS5zZWxlY3RlZCgpKXtcbiAgICAgICAgICAgIGN5Lm5vZGVzKCkudW5zZWxlY3QoKTtcbiAgICAgICAgICB9ICAgICAgICAgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKCd0YXBkcmFnJywgZVRhcERyYWcgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IG1vdmVkQmVuZEVkZ2U7XG4gICAgICAgICAgaWYobW92ZWRCZW5kRWRnZSAhPT0gdW5kZWZpbmVkICYmIGJlbmRQb2ludFV0aWxpdGllcy5pc0lnbm9yZWRFZGdlKGVkZ2UpICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmKGNyZWF0ZUJlbmRPbkRyYWcpIHtcbiAgICAgICAgICAgIHZhciBjeVBvcyA9IGV2ZW50LnBvc2l0aW9uIHx8IGV2ZW50LmN5UG9zaXRpb247XG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuYWRkQmVuZFBvaW50KGVkZ2UsIGN5UG9zKTtcbiAgICAgICAgICAgIG1vdmVkQmVuZEluZGV4ID0gZ2V0Q29udGFpbmluZ0JlbmRTaGFwZUluZGV4KGN5UG9zLngsIGN5UG9zLnksIGVkZ2UpO1xuICAgICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IGVkZ2U7XG4gICAgICAgICAgICBjcmVhdGVCZW5kT25EcmFnID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgZGlzYWJsZUdlc3R1cmVzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmIChtb3ZlZEJlbmRFZGdlID09PSB1bmRlZmluZWQgfHwgKG1vdmVkQmVuZEluZGV4ID09PSB1bmRlZmluZWQgJiYgbW92ZWRFbmRQb2ludCA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFVwZGF0ZSBlbmQgcG9pbnQgbG9jYXRpb24gKFNvdXJjZTowLCBUYXJnZXQ6MSlcbiAgICAgICAgICBpZihtb3ZlZEVuZFBvaW50ICE9IC0xICYmIGR1bW15Tm9kZSl7XG4gICAgICAgICAgICB2YXIgbmV3UG9zID0gZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbjtcbiAgICAgICAgICAgIGR1bW15Tm9kZS5wb3NpdGlvbihuZXdQb3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBVcGRhdGUgYmVuZCBwb2ludCBsb2NhdGlvblxuICAgICAgICAgIGVsc2UgaWYobW92ZWRCZW5kSW5kZXggIT0gdW5kZWZpbmVkKXsgXG4gICAgICAgICAgICB2YXIgd2VpZ2h0cyA9IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcmVsYXRpdmVCZW5kUG9zaXRpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgZXZlbnQucG9zaXRpb24gfHwgZXZlbnQuY3lQb3NpdGlvbik7XG4gICAgICAgICAgICB3ZWlnaHRzW21vdmVkQmVuZEluZGV4XSA9IHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodDtcbiAgICAgICAgICAgIGRpc3RhbmNlc1ttb3ZlZEJlbmRJbmRleF0gPSByZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCB3ZWlnaHRzKTtcbiAgICAgICAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdEaXN0YW5jZXMnLCBkaXN0YW5jZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZihldmVudC50YXJnZXQgJiYgZXZlbnQudGFyZ2V0WzBdICYmIGV2ZW50LnRhcmdldC5pc05vZGUoKSl7XG4gICAgICAgICAgICBub2RlVG9BdHRhY2ggPSBldmVudC50YXJnZXQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjeS5vbigndGFwZW5kJywgZVRhcEVuZCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGxldCBlZGdlID0gbW92ZWRCZW5kRWRnZTtcblxuICAgICAgICAgIGlmKCBlZGdlICE9PSB1bmRlZmluZWQgKSB7XG5cbiAgICAgICAgICAgIGlmKCBtb3ZlZEJlbmRJbmRleCAhPSB1bmRlZmluZWQgKSB7XG4gICAgICAgICAgICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XG4gICAgICAgICAgICAgIHZhciBzdGFydFkgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd5Jyk7XG4gICAgICAgICAgICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xuICAgICAgICAgICAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBzZWdQdHMgPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcbiAgICAgICAgICAgICAgdmFyIGFsbFB0cyA9IFtzdGFydFgsIHN0YXJ0WV0uY29uY2F0KHNlZ1B0cykuY29uY2F0KFtlbmRYLCBlbmRZXSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB2YXIgcG9pbnRJbmRleCA9IG1vdmVkQmVuZEluZGV4ICsgMTtcbiAgICAgICAgICAgICAgdmFyIHByZUluZGV4ID0gcG9pbnRJbmRleCAtIDE7XG4gICAgICAgICAgICAgIHZhciBwb3NJbmRleCA9IHBvaW50SW5kZXggKyAxO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgdmFyIHBvaW50ID0ge1xuICAgICAgICAgICAgICAgIHg6IGFsbFB0c1syICogcG9pbnRJbmRleF0sXG4gICAgICAgICAgICAgICAgeTogYWxsUHRzWzIgKiBwb2ludEluZGV4ICsgMV1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBwcmVQb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiBhbGxQdHNbMiAqIHByZUluZGV4XSxcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHByZUluZGV4ICsgMV1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBwb3NQb2ludCA9IHtcbiAgICAgICAgICAgICAgICB4OiBhbGxQdHNbMiAqIHBvc0luZGV4XSxcbiAgICAgICAgICAgICAgICB5OiBhbGxQdHNbMiAqIHBvc0luZGV4ICsgMV1cbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBuZWFyVG9MaW5lO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYoICggcG9pbnQueCA9PT0gcHJlUG9pbnQueCAmJiBwb2ludC55ID09PSBwcmVQb2ludC55ICkgfHwgKCBwb2ludC54ID09PSBwcmVQb2ludC54ICYmIHBvaW50LnkgPT09IHByZVBvaW50LnkgKSApIHtcbiAgICAgICAgICAgICAgICBuZWFyVG9MaW5lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbTEgPSAoIHByZVBvaW50LnkgLSBwb3NQb2ludC55ICkgLyAoIHByZVBvaW50LnggLSBwb3NQb2ludC54ICk7XG4gICAgICAgICAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcblxuICAgICAgICAgICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcbiAgICAgICAgICAgICAgICAgIHNyY1BvaW50OiBwcmVQb2ludCxcbiAgICAgICAgICAgICAgICAgIHRndFBvaW50OiBwb3NQb2ludCxcbiAgICAgICAgICAgICAgICAgIG0xOiBtMSxcbiAgICAgICAgICAgICAgICAgIG0yOiBtMlxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEludGVyc2VjdGlvbiA9IGJlbmRQb2ludFV0aWxpdGllcy5nZXRJbnRlcnNlY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdCA9IE1hdGguc3FydCggTWF0aC5wb3coIChwb2ludC54IC0gY3VycmVudEludGVyc2VjdGlvbi54KSwgMiApIFxuICAgICAgICAgICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKHBvaW50LnkgLSBjdXJyZW50SW50ZXJzZWN0aW9uLnkpLCAyICkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIE1hdGgucG93KCAocG9zUG9pbnQueCAtIHByZVBvaW50LngpLCAyICkgXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICArIE1hdGgucG93KCAocG9zUG9pbnQueSAtIHByZVBvaW50LnkpLCAyICkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmKCBkaXN0ICA8IG9wdGlvbnMoKS5iZW5kUmVtb3ZhbFNlbnNpdGl2aXR5ICkge1xuICAgICAgICAgICAgICAgICAgbmVhclRvTGluZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiggbmVhclRvTGluZSApXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMucmVtb3ZlQmVuZFBvaW50KGVkZ2UsIG1vdmVkQmVuZEluZGV4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYoZHVtbXlOb2RlICE9IHVuZGVmaW5lZCAmJiAobW92ZWRFbmRQb2ludCA9PSAwIHx8IG1vdmVkRW5kUG9pbnQgPT0gMSkgKXtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHZhciBuZXdOb2RlID0gZGV0YWNoZWROb2RlO1xuICAgICAgICAgICAgICB2YXIgaXNWYWxpZCA9ICd2YWxpZCc7XG4gICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gJ3NvdXJjZScgOiAndGFyZ2V0JztcblxuICAgICAgICAgICAgICAvLyB2YWxpZGF0ZSBlZGdlIHJlY29ubmVjdGlvblxuICAgICAgICAgICAgICBpZihub2RlVG9BdHRhY2gpe1xuICAgICAgICAgICAgICAgIHZhciBuZXdTb3VyY2UgPSAobW92ZWRFbmRQb2ludCA9PSAwKSA/IG5vZGVUb0F0dGFjaCA6IGVkZ2Uuc291cmNlKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1RhcmdldCA9IChtb3ZlZEVuZFBvaW50ID09IDEpID8gbm9kZVRvQXR0YWNoIDogZWRnZS50YXJnZXQoKTtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgdmFsaWRhdGVFZGdlID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICAgICAgICBpc1ZhbGlkID0gdmFsaWRhdGVFZGdlKGVkZ2UsIG5ld1NvdXJjZSwgbmV3VGFyZ2V0KTtcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gKGlzVmFsaWQgPT09ICd2YWxpZCcpID8gbm9kZVRvQXR0YWNoIDogZGV0YWNoZWROb2RlO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdmFyIG5ld1NvdXJjZSA9IChtb3ZlZEVuZFBvaW50ID09IDApID8gbmV3Tm9kZSA6IGVkZ2Uuc291cmNlKCk7XG4gICAgICAgICAgICAgIHZhciBuZXdUYXJnZXQgPSAobW92ZWRFbmRQb2ludCA9PSAxKSA/IG5ld05vZGUgOiBlZGdlLnRhcmdldCgpO1xuICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0aW9uVXRpbGl0aWVzLmNvbm5lY3RFZGdlKGVkZ2UsIGRldGFjaGVkTm9kZSwgbG9jYXRpb24pO1xuXG4gICAgICAgICAgICAgIGlmKGRldGFjaGVkTm9kZS5pZCgpICE9PSBuZXdOb2RlLmlkKCkpe1xuICAgICAgICAgICAgICAgIC8vIHVzZSBnaXZlbiBoYW5kbGVSZWNvbm5lY3RFZGdlIGZ1bmN0aW9uIFxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBoYW5kbGVSZWNvbm5lY3RFZGdlID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgICAgICAgIHZhciByZWNvbm5lY3RlZEVkZ2UgPSBoYW5kbGVSZWNvbm5lY3RFZGdlKG5ld1NvdXJjZS5pZCgpLCBuZXdUYXJnZXQuaWQoKSwgZWRnZS5kYXRhKCkpO1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBpZihyZWNvbm5lY3RlZEVkZ2Upe1xuICAgICAgICAgICAgICAgICAgICByZWNvbm5lY3Rpb25VdGlsaXRpZXMuY29weUVkZ2UoZWRnZSwgcmVjb25uZWN0ZWRFZGdlKTtcbiAgICAgICAgICAgICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMoKS5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIFtyZWNvbm5lY3RlZEVkZ2VdKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgaWYocmVjb25uZWN0ZWRFZGdlICYmIG9wdGlvbnMoKS51bmRvYWJsZSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgbmV3RWRnZTogcmVjb25uZWN0ZWRFZGdlLFxuICAgICAgICAgICAgICAgICAgICAgIG9sZEVkZ2U6IGVkZ2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgY3kudW5kb1JlZG8oKS5kbygncmVtb3ZlUmVjb25uZWN0ZWRFZGdlJywgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgZWRnZSA9IHJlY29ubmVjdGVkRWRnZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGVsc2UgaWYocmVjb25uZWN0ZWRFZGdlKXtcbiAgICAgICAgICAgICAgICAgICAgY3kucmVtb3ZlKGVkZ2UpO1xuICAgICAgICAgICAgICAgICAgICBlZGdlID0gcmVjb25uZWN0ZWRFZGdlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgdmFyIGxvYyA9IChtb3ZlZEVuZFBvaW50ID09IDApID8ge3NvdXJjZTogbmV3Tm9kZS5pZCgpfSA6IHt0YXJnZXQ6IG5ld05vZGUuaWQoKX07XG4gICAgICAgICAgICAgICAgICB2YXIgb2xkTG9jID0gKG1vdmVkRW5kUG9pbnQgPT0gMCkgPyB7c291cmNlOiBkZXRhY2hlZE5vZGUuaWQoKX0gOiB7dGFyZ2V0OiBkZXRhY2hlZE5vZGUuaWQoKX07XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSAmJiBuZXdOb2RlLmlkKCkgIT09IGRldGFjaGVkTm9kZS5pZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICBlZGdlOiBlZGdlLFxuICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBsb2MsXG4gICAgICAgICAgICAgICAgICAgICAgb2xkTG9jOiBvbGRMb2NcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGN5LnVuZG9SZWRvKCkuZG8oJ3JlY29ubmVjdEVkZ2UnLCBwYXJhbSk7XG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSByZXN1bHQuZWRnZTtcbiAgICAgICAgICAgICAgICAgICAgLy9lZGdlLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gIFxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gaW52YWxpZCBlZGdlIHJlY29ubmVjdGlvbiBjYWxsYmFja1xuICAgICAgICAgICAgICBpZihpc1ZhbGlkICE9PSAndmFsaWQnICYmIHR5cGVvZiBhY3RPblVuc3VjY2Vzc2Z1bFJlY29ubmVjdGlvbiA9PT0gJ2Z1bmN0aW9uJyl7XG4gICAgICAgICAgICAgICAgYWN0T25VbnN1Y2Nlc3NmdWxSZWNvbm5lY3Rpb24oKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlZGdlLnNlbGVjdCgpO1xuICAgICAgICAgICAgICBjeS5yZW1vdmUoZHVtbXlOb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW92ZWRCZW5kRWRnZS5zZWxlY3QoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoZWRnZSAhPT0gdW5kZWZpbmVkICYmIG1vdmVCZW5kUGFyYW0gIT09IHVuZGVmaW5lZCAmJiBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpXG4gICAgICAgICAgJiYgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKS50b1N0cmluZygpICE9IG1vdmVCZW5kUGFyYW0ud2VpZ2h0cy50b1N0cmluZygpKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmKG9wdGlvbnMoKS51bmRvYWJsZSkge1xuICAgICAgICAgICAgICBjeS51bmRvUmVkbygpLmRvKCdjaGFuZ2VCZW5kUG9pbnRzJywgbW92ZUJlbmRQYXJhbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuXG4gICAgICAgICAgbW92ZWRCZW5kSW5kZXggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgbW92ZWRCZW5kRWRnZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBtb3ZlQmVuZFBhcmFtID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGNyZWF0ZUJlbmRPbkRyYWcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgbW92ZWRFbmRQb2ludCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBkdW1teU5vZGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgZGV0YWNoZWROb2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIG5vZGVUb0F0dGFjaCA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgIHJlc2V0R2VzdHVyZXMoKTtcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cmVmcmVzaERyYXdzKCl9LCA1MCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vVmFyaWFibGVzIHVzZWQgZm9yIHN0YXJ0aW5nIGFuZCBlbmRpbmcgdGhlIG1vdmVtZW50IG9mIGJlbmQgcG9pbnRzIHdpdGggYXJyb3dzXG4gICAgICAgIHZhciBtb3ZlcGFyYW07XG4gICAgICAgIHZhciBmaXJzdEJlbmRQb2ludDtcbiAgICAgICAgdmFyIGVkZ2VDb250YWluaW5nRmlyc3RCZW5kUG9pbnQ7XG4gICAgICAgIHZhciBmaXJzdEJlbmRQb2ludEZvdW5kO1xuICAgICAgICBjeS5vbihcImVkZ2ViZW5kZWRpdGluZy5tb3Zlc3RhcnRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XG4gICAgICAgICAgICBmaXJzdEJlbmRQb2ludEZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoZWRnZXNbMF0gIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcbiAgICAgICAgICAgICAgICAgIGlmIChiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKSAhPSB1bmRlZmluZWQgJiYgIWZpcnN0QmVuZFBvaW50Rm91bmQpXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnQgPSB7IHg6IGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVkZ2UpWzBdLCB5OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKVsxXX07XG4gICAgICAgICAgICAgICAgICAgICAgbW92ZXBhcmFtID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFRpbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0QmVuZFBvaW50UG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGZpcnN0QmVuZFBvaW50LngsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBmaXJzdEJlbmRQb2ludC55XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2VzOiBlZGdlc1xuICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludCA9IGVkZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgZmlyc3RCZW5kUG9pbnRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5Lm9uKFwiZWRnZWJlbmRlZGl0aW5nLm1vdmVlbmRcIiwgZnVuY3Rpb24gKGUsIGVkZ2VzKSB7XG4gICAgICAgICAgICBpZiAobW92ZXBhcmFtICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5pdGlhbFBvcyA9IG1vdmVwYXJhbS5maXJzdEJlbmRQb2ludFBvc2l0aW9uO1xuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEZpcnN0QmVuZFBvaW50ID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlQ29udGFpbmluZ0ZpcnN0QmVuZFBvaW50KVswXSxcbiAgICAgICAgICAgICAgICAgICAgeTogYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRQb2ludHMoZWRnZUNvbnRhaW5pbmdGaXJzdEJlbmRQb2ludClbMV1cbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBtb3ZlcGFyYW0ucG9zaXRpb25EaWZmID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiAtbW92ZWRGaXJzdEJlbmRQb2ludC54ICsgaW5pdGlhbFBvcy54LFxuICAgICAgICAgICAgICAgICAgICB5OiAtbW92ZWRGaXJzdEJlbmRQb2ludC55ICsgaW5pdGlhbFBvcy55XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1vdmVwYXJhbS5maXJzdEJlbmRQb2ludFBvc2l0aW9uO1xuXG4gICAgICAgICAgICAgICAgaWYob3B0aW9ucygpLnVuZG9hYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN5LnVuZG9SZWRvKCkuZG8oXCJtb3ZlQmVuZFBvaW50c1wiLCBtb3ZlcGFyYW0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1vdmVwYXJhbSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kub24oJ2N4dHRhcCcsICdlZGdlJywgZUN4dFRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcbiAgICAgICAgICBcbiAgICAgICAgICB2YXIgbWVudXMgPSBjeS5jb250ZXh0TWVudXMoJ2dldCcpOyAvLyBnZXQgY29udGV4dCBtZW51cyBpbnN0YW5jZVxuICAgICAgICAgIFxuICAgICAgICAgIGlmKCFlZGdlVG9IaWdobGlnaHRCZW5kcyB8fCBlZGdlVG9IaWdobGlnaHRCZW5kcy5pZCgpICE9IGVkZ2UuaWQoKSB8fCBiZW5kUG9pbnRVdGlsaXRpZXMuaXNJZ25vcmVkRWRnZShlZGdlKSkge1xuICAgICAgICAgICAgbWVudXMuaGlkZU1lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XG4gICAgICAgICAgICBtZW51cy5oaWRlTWVudUl0ZW0oYWRkQmVuZFBvaW50Q3h0TWVudUlkKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY3lQb3MgPSBldmVudC5wb3NpdGlvbiB8fCBldmVudC5jeVBvc2l0aW9uO1xuICAgICAgICAgIHZhciBzZWxlY3RlZEJlbmRJbmRleCA9IGdldENvbnRhaW5pbmdCZW5kU2hhcGVJbmRleChjeVBvcy54LCBjeVBvcy55LCBlZGdlKTtcbiAgICAgICAgICBpZiAoc2VsZWN0ZWRCZW5kSW5kZXggPT0gLTEpIHtcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShyZW1vdmVCZW5kUG9pbnRDeHRNZW51SWQpO1xuICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKGFkZEJlbmRQb2ludEN4dE1lbnVJZCk7XG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEN0eFBvcyA9IGN5UG9zO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG1lbnVzLmhpZGVNZW51SXRlbShhZGRCZW5kUG9pbnRDeHRNZW51SWQpO1xuICAgICAgICAgICAgbWVudXMuc2hvd01lbnVJdGVtKHJlbW92ZUJlbmRQb2ludEN4dE1lbnVJZCk7XG4gICAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuY3VycmVudEJlbmRJbmRleCA9IHNlbGVjdGVkQmVuZEluZGV4O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5jdXJyZW50Q3R4RWRnZSA9IGVkZ2U7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY3kub24oJ2N5ZWRnZWJlbmRlZGl0aW5nLmNoYW5nZUJlbmRQb2ludHMnLCAnZWRnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBlZGdlID0gdGhpcztcbiAgICAgICAgICBjeS5zdGFydEJhdGNoKCk7XG4gICAgICAgICAgLy8gY3kuZWRnZXMoKS51bnNlbGVjdCgpOyBcbiAgICAgICAgICAvL2VkZ2Uuc2VsZWN0KCk7ICAgICAgICAgICAgICBcbiAgICAgICAgICBjeS50cmlnZ2VyKCdiZW5kUG9pbnRNb3ZlbWVudCcpOyAgICAgICAgXG4gICAgICAgICAgY3kuZW5kQmF0Y2goKTsgICAgICAgICAgXG4gICAgICAgICAgcmVmcmVzaERyYXdzKCk7XG4gICAgICAgIFxuICAgICAgICAgIFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNlbGVjdGVkRWRnZXM7XG4gICAgICB2YXIgYmVuZFBvaW50c01vdmluZyA9IGZhbHNlO1xuXG4gICAgICBmdW5jdGlvbiBrZXlEb3duKGUpIHtcblxuICAgICAgICAgIHZhciBzaG91bGRNb3ZlID0gdHlwZW9mIG9wdGlvbnMoKS5tb3ZlU2VsZWN0ZWRCZW5kUG9pbnRzT25LZXlFdmVudHMgPT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgPyBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzKCkgOiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzO1xuXG4gICAgICAgICAgaWYgKCFzaG91bGRNb3ZlKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvL0NoZWNrcyBpZiB0aGUgdGFnbmFtZSBpcyB0ZXh0YXJlYSBvciBpbnB1dFxuICAgICAgICAgIHZhciB0biA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFnTmFtZTtcbiAgICAgICAgICBpZiAodG4gIT0gXCJURVhUQVJFQVwiICYmIHRuICE9IFwiSU5QVVRcIilcbiAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpe1xuICAgICAgICAgICAgICAgICAgY2FzZSAzNzogY2FzZSAzOTogY2FzZSAzODogIGNhc2UgNDA6IC8vIEFycm93IGtleXNcbiAgICAgICAgICAgICAgICAgIGNhc2UgMzI6IGUucHJldmVudERlZmF1bHQoKTsgYnJlYWs7IC8vIFNwYWNlXG4gICAgICAgICAgICAgICAgICBkZWZhdWx0OiBicmVhazsgLy8gZG8gbm90IGJsb2NrIG90aGVyIGtleXNcbiAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA8ICczNycgfHwgZS5rZXlDb2RlID4gJzQwJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy9DaGVja3MgaWYgb25seSBlZGdlcyBhcmUgc2VsZWN0ZWQgKG5vdCBhbnkgbm9kZSkgYW5kIGlmIG9ubHkgMSBlZGdlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgIC8vSWYgdGhlIHNlY29uZCBjaGVja2luZyBpcyByZW1vdmVkIHRoZSBiZW5kIHBvaW50cyBvZiBtdWx0aXBsZSBlZGdlcyB3b3VsZCBtb3ZlXG4gICAgICAgICAgICAgIGlmIChjeS5lZGdlcyhcIjpzZWxlY3RlZFwiKS5sZW5ndGggIT0gY3kuZWxlbWVudHMoXCI6c2VsZWN0ZWRcIikubGVuZ3RoIHx8IGN5LmVkZ2VzKFwiOnNlbGVjdGVkXCIpLmxlbmd0aCAhPSAxKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKCFiZW5kUG9pbnRzTW92aW5nKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBzZWxlY3RlZEVkZ2VzID0gY3kuZWRnZXMoJzpzZWxlY3RlZCcpO1xuICAgICAgICAgICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2ViZW5kZWRpdGluZy5tb3Zlc3RhcnRcIiwgW3NlbGVjdGVkRWRnZXNdKTtcbiAgICAgICAgICAgICAgICAgIGJlbmRQb2ludHNNb3ZpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93IGFuZCBhbHRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5Oi0xfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICc0MCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGRvd24gYXJyb3cgYW5kIGFsdFxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6MX0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAnMzcnKSB7XG4gICAgICAgICAgICAgICAgICAvLyBsZWZ0IGFycm93IGFuZCBhbHRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMSwgeTowfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmFsdEtleSAmJiBlLndoaWNoID09ICczOScpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHJpZ2h0IGFycm93IGFuZCBhbHRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDoxLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5zaGlmdEtleSAmJiBlLndoaWNoID09ICczOCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHVwIGFycm93IGFuZCBzaGlmdFxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6LTEwfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzQwJykge1xuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvdyBhbmQgc2hpZnRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDowLCB5OjEwfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzM3Jykge1xuICAgICAgICAgICAgICAgICAgLy8gbGVmdCBhcnJvdyBhbmQgc2hpZnRcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMTAsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XG5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLnNoaWZ0S2V5ICYmIGUud2hpY2ggPT0gJzM5JyApIHtcbiAgICAgICAgICAgICAgICAgIC8vIHJpZ2h0IGFycm93IGFuZCBzaGlmdFxuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjEwLCB5OjB9LHNlbGVjdGVkRWRnZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgaWYgKGUua2V5Q29kZSA9PSAnMzgnKSB7XG4gICAgICAgICAgICAgICAgICAvLyB1cCBhcnJvd1xuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMoe3g6IDAsIHk6IC0zfSwgc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzQwJykge1xuICAgICAgICAgICAgICAgICAgLy8gZG93biBhcnJvd1xuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjAsIHk6M30sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAoZS5rZXlDb2RlID09ICczNycpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGxlZnQgYXJyb3dcbiAgICAgICAgICAgICAgICAgIG1vdmVCZW5kUG9pbnRzICh7eDotMywgeTowfSxzZWxlY3RlZEVkZ2VzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmIChlLmtleUNvZGUgPT0gJzM5Jykge1xuICAgICAgICAgICAgICAgICAgLy9yaWdodCBhcnJvd1xuICAgICAgICAgICAgICAgICAgbW92ZUJlbmRQb2ludHMgKHt4OjMsIHk6MH0sc2VsZWN0ZWRFZGdlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBrZXlVcChlKSB7XG5cbiAgICAgICAgICBpZiAoZS5rZXlDb2RlIDwgJzM3JyB8fCBlLmtleUNvZGUgPiAnNDAnKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgc2hvdWxkTW92ZSA9IHR5cGVvZiBvcHRpb25zKCkubW92ZVNlbGVjdGVkQmVuZFBvaW50c09uS2V5RXZlbnRzID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgID8gb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cygpIDogb3B0aW9ucygpLm1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50cztcblxuICAgICAgICAgIGlmICghc2hvdWxkTW92ZSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3kudHJpZ2dlcihcImVkZ2ViZW5kZWRpdGluZy5tb3ZlZW5kXCIsIFtzZWxlY3RlZEVkZ2VzXSk7XG4gICAgICAgICAgc2VsZWN0ZWRFZGdlcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBiZW5kUG9pbnRzTW92aW5nID0gZmFsc2U7XG5cbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsa2V5RG93biwgdHJ1ZSk7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIixrZXlVcCwgdHJ1ZSk7XG5cbiAgICAgICRjb250YWluZXIuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmcnLCBkYXRhKTtcbiAgICB9LFxuICAgIHVuYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgICBjeS5vZmYoJ3JlbW92ZScsICdub2RlJywgZVJlbW92ZSlcbiAgICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGVBZGQpXG4gICAgICAgICAgLm9mZignc3R5bGUnLCAnZWRnZS5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50czpzZWxlY3RlZCcsIGVTdHlsZSlcbiAgICAgICAgICAub2ZmKCdzZWxlY3QnLCAnZWRnZScsIGVTZWxlY3QpXG4gICAgICAgICAgLm9mZigndW5zZWxlY3QnLCAnZWRnZScsIGVVbnNlbGVjdClcbiAgICAgICAgICAub2ZmKCd0YXBzdGFydCcsICdlZGdlJywgZVRhcFN0YXJ0KVxuICAgICAgICAgIC5vZmYoJ3RhcGRyYWcnLCBlVGFwRHJhZylcbiAgICAgICAgICAub2ZmKCd0YXBlbmQnLCBlVGFwRW5kKVxuICAgICAgICAgIC5vZmYoJ2N4dHRhcCcsIGVDeHRUYXApXG4gICAgICAgICAgLm9mZignZHJhZycsICdub2RlJyxlRHJhZyk7XG5cbiAgICAgICAgY3kudW5iaW5kKFwiem9vbSBwYW5cIiwgZVpvb20pO1xuICAgIH1cbiAgfTtcblxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KCQoY3kuY29udGFpbmVyKCkpLCBhcmd1bWVudHMpO1xuICB9IGVsc2Uge1xuICAgICQuZXJyb3IoJ05vIHN1Y2ggZnVuY3Rpb24gYCcgKyBmbiArICdgIGZvciBjeXRvc2NhcGUuanMtZWRnZS1lZGl0aW5nJyk7XG4gIH1cblxuICByZXR1cm4gJCh0aGlzKTtcbn07XG4iLCJ2YXIgYmVuZFBvaW50VXRpbGl0aWVzID0ge1xuICBjdXJyZW50Q3R4RWRnZTogdW5kZWZpbmVkLFxuICBjdXJyZW50Q3R4UG9zOiB1bmRlZmluZWQsXG4gIGN1cnJlbnRCZW5kSW5kZXg6IHVuZGVmaW5lZCxcbiAgaWdub3JlZENsYXNzZXM6IHVuZGVmaW5lZCxcbiAgc2V0SWdub3JlZENsYXNzZXM6IGZ1bmN0aW9uKF9pZ25vcmVkQ2xhc3Nlcykge1xuICAgIHRoaXMuaWdub3JlZENsYXNzZXMgPSBfaWdub3JlZENsYXNzZXM7XG4gIH0sXG4gIC8vIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBiYXNlZCBvbiBiZW5kUG9zaXRpb25zRmNuXG4gIGluaXRCZW5kUG9pbnRzOiBmdW5jdGlvbihiZW5kUG9zaXRpb25zRmNuLCBlZGdlcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlZGdlID0gZWRnZXNbaV07XG4gICAgICBpZighdGhpcy5pc0lnbm9yZWRFZGdlKGVkZ2UpKSB7XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBiZW5kIHBvc2l0aW9ucyBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gZm9yIHRoaXMgZWRnZVxuICAgICAgICB2YXIgYmVuZFBvc2l0aW9ucyA9IGJlbmRQb3NpdGlvbnNGY24uYXBwbHkodGhpcywgZWRnZSk7XG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWxhdGl2ZSBiZW5kIHBvc2l0aW9uc1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbnMoZWRnZSwgYmVuZFBvc2l0aW9ucyk7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIGJlbmQgcG9pbnRzIHNldCB3ZWlnaHRzIGFuZCBkaXN0YW5jZXMgYWNjb3JkaW5nbHkgYW5kIGFkZCBjbGFzcyB0byBlbmFibGUgc3R5bGUgY2hhbmdlc1xuICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCByZXN1bHQud2VpZ2h0cyk7XG4gICAgICAgICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIHJlc3VsdC5kaXN0YW5jZXMpO1xuICAgICAgICAgIGVkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgaXNJZ25vcmVkRWRnZTogZnVuY3Rpb24oZWRnZSkge1xuXG4gICAgdmFyIHN0YXJ0WCA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3gnKTtcbiAgICB2YXIgc3RhcnRZID0gZWRnZS5zb3VyY2UoKS5wb3NpdGlvbigneScpO1xuICAgIHZhciBlbmRYID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneCcpO1xuICAgIHZhciBlbmRZID0gZWRnZS50YXJnZXQoKS5wb3NpdGlvbigneScpO1xuICAgXG4gICAgaWYoKHN0YXJ0WCA9PSBlbmRYICYmIHN0YXJ0WSA9PSBlbmRZKSAgfHwgKGVkZ2Uuc291cmNlKCkuaWQoKSA9PSBlZGdlLnRhcmdldCgpLmlkKCkpKXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBmb3IodmFyIGkgPSAwOyB0aGlzLmlnbm9yZWRDbGFzc2VzICYmIGkgPCAgdGhpcy5pZ25vcmVkQ2xhc3Nlcy5sZW5ndGg7IGkrKyl7XG4gICAgICBpZihlZGdlLmhhc0NsYXNzKHRoaXMuaWdub3JlZENsYXNzZXNbaV0pKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gc291cmNlIHBvaW50IHRvIHRoZSB0YXJnZXQgcG9pbnRcbiAgZ2V0TGluZURpcmVjdGlvbjogZnVuY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KXtcbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA8IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPCB0Z3RQb2ludC54KXtcbiAgICAgIHJldHVybiAyO1xuICAgIH1cbiAgICBpZihzcmNQb2ludC55IDwgdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDM7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPCB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcbiAgICAgIHJldHVybiA0O1xuICAgIH1cbiAgICBpZihzcmNQb2ludC55ID09IHRndFBvaW50LnkgJiYgc3JjUG9pbnQueCA+IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDU7XG4gICAgfVxuICAgIGlmKHNyY1BvaW50LnkgPiB0Z3RQb2ludC55ICYmIHNyY1BvaW50LnggPiB0Z3RQb2ludC54KXtcbiAgICAgIHJldHVybiA2O1xuICAgIH1cbiAgICBpZihzcmNQb2ludC55ID4gdGd0UG9pbnQueSAmJiBzcmNQb2ludC54ID09IHRndFBvaW50Lngpe1xuICAgICAgcmV0dXJuIDc7XG4gICAgfVxuICAgIHJldHVybiA4Oy8vaWYgc3JjUG9pbnQueSA+IHRndFBvaW50LnkgYW5kIHNyY1BvaW50LnggPCB0Z3RQb2ludC54XG4gIH0sXG4gIGdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzOiBmdW5jdGlvbiAoZWRnZSkge1xuICAgIHZhciBzb3VyY2VOb2RlID0gZWRnZS5zb3VyY2UoKTtcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IGVkZ2UudGFyZ2V0KCk7XG4gICAgXG4gICAgdmFyIHRndFBvc2l0aW9uID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xuICAgIHZhciBzcmNQb3NpdGlvbiA9IHNvdXJjZU5vZGUucG9zaXRpb24oKTtcbiAgICBcbiAgICB2YXIgc3JjUG9pbnQgPSBzb3VyY2VOb2RlLnBvc2l0aW9uKCk7XG4gICAgdmFyIHRndFBvaW50ID0gdGFyZ2V0Tm9kZS5wb3NpdGlvbigpO1xuXG5cbiAgICB2YXIgbTEgPSAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpIC8gKHRndFBvaW50LnggLSBzcmNQb2ludC54KTtcbiAgICB2YXIgbTIgPSAtMSAvIG0xO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG0xOiBtMSxcbiAgICAgIG0yOiBtMixcbiAgICAgIHNyY1BvaW50OiBzcmNQb2ludCxcbiAgICAgIHRndFBvaW50OiB0Z3RQb2ludFxuICAgIH07XG4gIH0sXG4gIGdldEludGVyc2VjdGlvbjogZnVuY3Rpb24oZWRnZSwgcG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKXtcbiAgICBpZiAoc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xuICAgIH1cblxuICAgIHZhciBzcmNQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnNyY1BvaW50O1xuICAgIHZhciB0Z3RQb2ludCA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLnRndFBvaW50O1xuICAgIHZhciBtMSA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0xO1xuICAgIHZhciBtMiA9IHNyY1RndFBvaW50c0FuZFRhbmdlbnRzLm0yO1xuXG4gICAgdmFyIGludGVyc2VjdFg7XG4gICAgdmFyIGludGVyc2VjdFk7XG5cbiAgICBpZihtMSA9PSBJbmZpbml0eSB8fCBtMSA9PSAtSW5maW5pdHkpe1xuICAgICAgaW50ZXJzZWN0WCA9IHNyY1BvaW50Lng7XG4gICAgICBpbnRlcnNlY3RZID0gcG9pbnQueTtcbiAgICB9XG4gICAgZWxzZSBpZihtMSA9PSAwKXtcbiAgICAgIGludGVyc2VjdFggPSBwb2ludC54O1xuICAgICAgaW50ZXJzZWN0WSA9IHNyY1BvaW50Lnk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGExID0gc3JjUG9pbnQueSAtIG0xICogc3JjUG9pbnQueDtcbiAgICAgIHZhciBhMiA9IHBvaW50LnkgLSBtMiAqIHBvaW50Lng7XG5cbiAgICAgIGludGVyc2VjdFggPSAoYTIgLSBhMSkgLyAobTEgLSBtMik7XG4gICAgICBpbnRlcnNlY3RZID0gbTEgKiBpbnRlcnNlY3RYICsgYTE7XG4gICAgfVxuXG4gICAgLy9JbnRlcnNlY3Rpb24gcG9pbnQgaXMgdGhlIGludGVyc2VjdGlvbiBvZiB0aGUgbGluZXMgcGFzc2luZyB0aHJvdWdoIHRoZSBub2RlcyBhbmRcbiAgICAvL3Bhc3NpbmcgdGhyb3VnaCB0aGUgYmVuZCBwb2ludCBhbmQgcGVycGVuZGljdWxhciB0byB0aGUgb3RoZXIgbGluZVxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHtcbiAgICAgIHg6IGludGVyc2VjdFgsXG4gICAgICB5OiBpbnRlcnNlY3RZXG4gICAgfTtcbiAgICBcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uUG9pbnQ7XG4gIH0sXG4gIGdldFNlZ21lbnRQb2ludHM6IGZ1bmN0aW9uKGVkZ2UpIHtcbiAgICBcbiAgICB2YXIgc2VncHRzID0gW107XG5cbiAgICB2YXIgc2VnbWVudFdzID0gZWRnZS5wc3R5bGUoICdzZWdtZW50LXdlaWdodHMnICkucGZWYWx1ZTtcbiAgICB2YXIgc2VnbWVudERzID0gZWRnZS5wc3R5bGUoICdzZWdtZW50LWRpc3RhbmNlcycgKS5wZlZhbHVlO1xuICAgIHZhciBzZWdtZW50c04gPSBNYXRoLm1pbiggc2VnbWVudFdzLmxlbmd0aCwgc2VnbWVudERzLmxlbmd0aCApO1xuICAgIFxuICAgIHZhciBzcmNQb3MgPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCk7XG4gICAgdmFyIHRndFBvcyA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oKTtcblxuICAgIHZhciBkeSA9ICggdGd0UG9zLnkgLSBzcmNQb3MueSApO1xuICAgIHZhciBkeCA9ICggdGd0UG9zLnggLSBzcmNQb3MueCApO1xuICAgIFxuICAgIHZhciBsID0gTWF0aC5zcXJ0KCBkeCAqIGR4ICsgZHkgKiBkeSApO1xuXG4gICAgdmFyIHZlY3RvciA9IHtcbiAgICAgIHg6IGR4LFxuICAgICAgeTogZHlcbiAgICB9O1xuXG4gICAgdmFyIHZlY3Rvck5vcm0gPSB7XG4gICAgICB4OiB2ZWN0b3IueCAvIGwsXG4gICAgICB5OiB2ZWN0b3IueSAvIGxcbiAgICB9O1xuICAgIFxuICAgIHZhciB2ZWN0b3JOb3JtSW52ZXJzZSA9IHtcbiAgICAgIHg6IC12ZWN0b3JOb3JtLnksXG4gICAgICB5OiB2ZWN0b3JOb3JtLnhcbiAgICB9O1xuXG4gICAgZm9yKCB2YXIgcyA9IDA7IHMgPCBzZWdtZW50c047IHMrKyApe1xuICAgICAgdmFyIHcgPSBzZWdtZW50V3NbIHMgXTtcbiAgICAgIHZhciBkID0gc2VnbWVudERzWyBzIF07XG5cbiAgICAgIC8vIGQgPSBzd2FwcGVkRGlyZWN0aW9uID8gLWQgOiBkO1xuICAgICAgLy9cbiAgICAgIC8vIGQgPSBNYXRoLmFicyhkKTtcblxuICAgICAgLy8gdmFyIHcxID0gIXN3YXBwZWREaXJlY3Rpb24gPyAoMSAtIHcpIDogdztcbiAgICAgIC8vIHZhciB3MiA9ICFzd2FwcGVkRGlyZWN0aW9uID8gdyA6ICgxIC0gdyk7XG5cbiAgICAgIHZhciB3MSA9ICgxIC0gdyk7XG4gICAgICB2YXIgdzIgPSB3O1xuXG4gICAgICB2YXIgcG9zUHRzID0ge1xuICAgICAgICB4MTogc3JjUG9zLngsXG4gICAgICAgIHgyOiB0Z3RQb3MueCxcbiAgICAgICAgeTE6IHNyY1Bvcy55LFxuICAgICAgICB5MjogdGd0UG9zLnlcbiAgICAgIH07XG5cbiAgICAgIHZhciBtaWRwdFB0cyA9IHBvc1B0cztcbiAgICAgIFxuICAgICAgXG5cbiAgICAgIHZhciBhZGp1c3RlZE1pZHB0ID0ge1xuICAgICAgICB4OiBtaWRwdFB0cy54MSAqIHcxICsgbWlkcHRQdHMueDIgKiB3MixcbiAgICAgICAgeTogbWlkcHRQdHMueTEgKiB3MSArIG1pZHB0UHRzLnkyICogdzJcbiAgICAgIH07XG5cbiAgICAgIHNlZ3B0cy5wdXNoKFxuICAgICAgICBhZGp1c3RlZE1pZHB0LnggKyB2ZWN0b3JOb3JtSW52ZXJzZS54ICogZCxcbiAgICAgICAgYWRqdXN0ZWRNaWRwdC55ICsgdmVjdG9yTm9ybUludmVyc2UueSAqIGRcbiAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzZWdwdHM7XG4gIH0sXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uOiBmdW5jdGlvbiAoZWRnZSwgYmVuZFBvaW50LCBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cykge1xuICAgIGlmIChzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHRoaXMuZ2V0U3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMoZWRnZSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBpbnRlcnNlY3Rpb25Qb2ludCA9IHRoaXMuZ2V0SW50ZXJzZWN0aW9uKGVkZ2UsIGJlbmRQb2ludCwgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMpO1xuICAgIHZhciBpbnRlcnNlY3RYID0gaW50ZXJzZWN0aW9uUG9pbnQueDtcbiAgICB2YXIgaW50ZXJzZWN0WSA9IGludGVyc2VjdGlvblBvaW50Lnk7XG4gICAgXG4gICAgdmFyIHNyY1BvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMuc3JjUG9pbnQ7XG4gICAgdmFyIHRndFBvaW50ID0gc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMudGd0UG9pbnQ7XG4gICAgXG4gICAgdmFyIHdlaWdodDtcbiAgICBcbiAgICBpZiggaW50ZXJzZWN0WCAhPSBzcmNQb2ludC54ICkge1xuICAgICAgd2VpZ2h0ID0gKGludGVyc2VjdFggLSBzcmNQb2ludC54KSAvICh0Z3RQb2ludC54IC0gc3JjUG9pbnQueCk7XG4gICAgfVxuICAgIGVsc2UgaWYoIGludGVyc2VjdFkgIT0gc3JjUG9pbnQueSApIHtcbiAgICAgIHdlaWdodCA9IChpbnRlcnNlY3RZIC0gc3JjUG9pbnQueSkgLyAodGd0UG9pbnQueSAtIHNyY1BvaW50LnkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdlaWdodCA9IDA7XG4gICAgfVxuICAgIFxuICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydChNYXRoLnBvdygoaW50ZXJzZWN0WSAtIGJlbmRQb2ludC55KSwgMilcbiAgICAgICAgKyBNYXRoLnBvdygoaW50ZXJzZWN0WCAtIGJlbmRQb2ludC54KSwgMikpO1xuICAgIFxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIGxpbmUgZm9ybSBzb3VyY2UgcG9pbnQgdG8gdGFyZ2V0IHBvaW50XG4gICAgdmFyIGRpcmVjdGlvbjEgPSB0aGlzLmdldExpbmVEaXJlY3Rpb24oc3JjUG9pbnQsIHRndFBvaW50KTtcbiAgICAvL0dldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSBsaW5lIGZyb20gaW50ZXNlY3Rpb24gcG9pbnQgdG8gYmVuZCBwb2ludFxuICAgIHZhciBkaXJlY3Rpb24yID0gdGhpcy5nZXRMaW5lRGlyZWN0aW9uKGludGVyc2VjdGlvblBvaW50LCBiZW5kUG9pbnQpO1xuICAgIFxuICAgIC8vSWYgdGhlIGRpZmZlcmVuY2UgaXMgbm90IC0yIGFuZCBub3QgNiB0aGVuIHRoZSBkaXJlY3Rpb24gb2YgdGhlIGRpc3RhbmNlIGlzIG5lZ2F0aXZlXG4gICAgaWYoZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gLTIgJiYgZGlyZWN0aW9uMSAtIGRpcmVjdGlvbjIgIT0gNil7XG4gICAgICBpZihkaXN0YW5jZSAhPSAwKVxuICAgICAgICBkaXN0YW5jZSA9IC0xICogZGlzdGFuY2U7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB7XG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcbiAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZVxuICAgIH07XG4gIH0sXG4gIGNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uczogZnVuY3Rpb24gKGVkZ2UsIGJlbmRQb2ludHMpIHtcbiAgICB2YXIgc3JjVGd0UG9pbnRzQW5kVGFuZ2VudHMgPSB0aGlzLmdldFNyY1RndFBvaW50c0FuZFRhbmdlbnRzKGVkZ2UpO1xuLy8gICAgdmFyIGJlbmRQb2ludHMgPSBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycpO1xuICAgIC8vb3V0cHV0IHZhcmlhYmxlc1xuICAgIHZhciB3ZWlnaHRzID0gW107XG4gICAgdmFyIGRpc3RhbmNlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGJlbmRQb2ludHMgJiYgaSA8IGJlbmRQb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBiZW5kUG9pbnQgPSBiZW5kUG9pbnRzW2ldO1xuICAgICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBiZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcblxuICAgICAgd2VpZ2h0cy5wdXNoKHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XG4gICAgICBkaXN0YW5jZXMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdlaWdodHM6IHdlaWdodHMsXG4gICAgICBkaXN0YW5jZXM6IGRpc3RhbmNlc1xuICAgIH07XG4gIH0sXG4gIGdldFNlZ21lbnREaXN0YW5jZXNTdHJpbmc6IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgdmFyIHN0ciA9IFwiXCI7XG5cbiAgICB2YXIgZGlzdGFuY2VzID0gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycpO1xuICAgIGZvciAodmFyIGkgPSAwOyBkaXN0YW5jZXMgJiYgaSA8IGRpc3RhbmNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgc3RyID0gc3RyICsgXCIgXCIgKyBkaXN0YW5jZXNbaV07XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzdHI7XG4gIH0sXG4gIGdldFNlZ21lbnRXZWlnaHRzU3RyaW5nOiBmdW5jdGlvbiAoZWRnZSkge1xuICAgIHZhciBzdHIgPSBcIlwiO1xuXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xuICAgIGZvciAodmFyIGkgPSAwOyB3ZWlnaHRzICYmIGkgPCB3ZWlnaHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzdHIgPSBzdHIgKyBcIiBcIiArIHdlaWdodHNbaV07XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzdHI7XG4gIH0sXG4gIGFkZEJlbmRQb2ludDogZnVuY3Rpb24oZWRnZSwgbmV3QmVuZFBvaW50KSB7XG4gICAgaWYoZWRnZSA9PT0gdW5kZWZpbmVkIHx8IG5ld0JlbmRQb2ludCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xuICAgICAgbmV3QmVuZFBvaW50ID0gdGhpcy5jdXJyZW50Q3R4UG9zO1xuICAgIH1cbiAgXG4gICAgdmFyIHJlbGF0aXZlQmVuZFBvc2l0aW9uID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQpO1xuICAgIHZhciBvcmlnaW5hbFBvaW50V2VpZ2h0ID0gcmVsYXRpdmVCZW5kUG9zaXRpb24ud2VpZ2h0O1xuICAgIFxuICAgIHZhciBzdGFydFggPSBlZGdlLnNvdXJjZSgpLnBvc2l0aW9uKCd4Jyk7XG4gICAgdmFyIHN0YXJ0WSA9IGVkZ2Uuc291cmNlKCkucG9zaXRpb24oJ3knKTtcbiAgICB2YXIgZW5kWCA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3gnKTtcbiAgICB2YXIgZW5kWSA9IGVkZ2UudGFyZ2V0KCkucG9zaXRpb24oJ3knKTtcbiAgICB2YXIgc3RhcnRXZWlnaHQgPSB0aGlzLmNvbnZlcnRUb1JlbGF0aXZlQmVuZFBvc2l0aW9uKGVkZ2UsIHt4OiBzdGFydFgsIHk6IHN0YXJ0WX0pLndlaWdodDtcbiAgICB2YXIgZW5kV2VpZ2h0ID0gdGhpcy5jb252ZXJ0VG9SZWxhdGl2ZUJlbmRQb3NpdGlvbihlZGdlLCB7eDogZW5kWCwgeTogZW5kWX0pLndlaWdodDtcbiAgICB2YXIgd2VpZ2h0c1dpdGhUZ3RTcmMgPSBbc3RhcnRXZWlnaHRdLmNvbmNhdChlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpP2VkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk6W10pLmNvbmNhdChbZW5kV2VpZ2h0XSk7XG4gICAgXG4gICAgdmFyIHNlZ1B0cyA9IHRoaXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcbiAgICBcbiAgICB2YXIgbWluRGlzdCA9IEluZmluaXR5O1xuICAgIHZhciBpbnRlcnNlY3Rpb247XG4gICAgdmFyIHNlZ3B0c1dpdGhUZ3RTcmMgPSBbc3RhcnRYLCBzdGFydFldXG4gICAgICAgICAgICAuY29uY2F0KHNlZ1B0cz9zZWdQdHM6W10pXG4gICAgICAgICAgICAuY29uY2F0KFtlbmRYLCBlbmRZXSk7XG4gICAgdmFyIG5ld0JlbmRJbmRleCA9IC0xO1xuICAgIFxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB3ZWlnaHRzV2l0aFRndFNyYy5sZW5ndGggLSAxOyBpKyspe1xuICAgICAgdmFyIHcxID0gd2VpZ2h0c1dpdGhUZ3RTcmNbaV07XG4gICAgICB2YXIgdzIgPSB3ZWlnaHRzV2l0aFRndFNyY1tpICsgMV07XG4gICAgICBcbiAgICAgIC8vY2hlY2sgaWYgdGhlIHdlaWdodCBpcyBiZXR3ZWVuIHcxIGFuZCB3MlxuICAgICAgY29uc3QgYjEgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsUG9pbnRXZWlnaHQsIHcxLCB0cnVlKTtcbiAgICAgIGNvbnN0IGIyID0gdGhpcy5jb21wYXJlV2l0aFByZWNpc2lvbihvcmlnaW5hbFBvaW50V2VpZ2h0LCB3Mik7XG4gICAgICBjb25zdCBiMyA9IHRoaXMuY29tcGFyZVdpdGhQcmVjaXNpb24ob3JpZ2luYWxQb2ludFdlaWdodCwgdzIsIHRydWUpO1xuICAgICAgY29uc3QgYjQgPSB0aGlzLmNvbXBhcmVXaXRoUHJlY2lzaW9uKG9yaWdpbmFsUG9pbnRXZWlnaHQsIHcxKTtcbiAgICAgIGlmKCAoYjEgJiYgYjIpIHx8IChiMyAmJiBiNCkpe1xuICAgICAgICB2YXIgc3RhcnRYID0gc2VncHRzV2l0aFRndFNyY1syICogaV07XG4gICAgICAgIHZhciBzdGFydFkgPSBzZWdwdHNXaXRoVGd0U3JjWzIgKiBpICsgMV07XG4gICAgICAgIHZhciBlbmRYID0gc2VncHRzV2l0aFRndFNyY1syICogaSArIDJdO1xuICAgICAgICB2YXIgZW5kWSA9IHNlZ3B0c1dpdGhUZ3RTcmNbMiAqIGkgKyAzXTtcbiAgICAgICAgXG4gICAgICAgIHZhciBzdGFydCA9IHtcbiAgICAgICAgICB4OiBzdGFydFgsXG4gICAgICAgICAgeTogc3RhcnRZXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB2YXIgZW5kID0ge1xuICAgICAgICAgIHg6IGVuZFgsXG4gICAgICAgICAgeTogZW5kWVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdmFyIG0xID0gKCBzdGFydFkgLSBlbmRZICkgLyAoIHN0YXJ0WCAtIGVuZFggKTtcbiAgICAgICAgdmFyIG0yID0gLTEgLyBtMTtcbiAgICAgICAgXG4gICAgICAgIHZhciBzcmNUZ3RQb2ludHNBbmRUYW5nZW50cyA9IHtcbiAgICAgICAgICBzcmNQb2ludDogc3RhcnQsXG4gICAgICAgICAgdGd0UG9pbnQ6IGVuZCxcbiAgICAgICAgICBtMTogbTEsXG4gICAgICAgICAgbTI6IG0yXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvL2dldCB0aGUgaW50ZXJzZWN0aW9uIG9mIHRoZSBjdXJyZW50IHNlZ21lbnQgd2l0aCB0aGUgbmV3IGJlbmQgcG9pbnRcbiAgICAgICAgdmFyIGN1cnJlbnRJbnRlcnNlY3Rpb24gPSB0aGlzLmdldEludGVyc2VjdGlvbihlZGdlLCBuZXdCZW5kUG9pbnQsIHNyY1RndFBvaW50c0FuZFRhbmdlbnRzKTtcbiAgICAgICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCAobmV3QmVuZFBvaW50LnggLSBjdXJyZW50SW50ZXJzZWN0aW9uLngpLCAyICkgXG4gICAgICAgICAgICAgICAgKyBNYXRoLnBvdyggKG5ld0JlbmRQb2ludC55IC0gY3VycmVudEludGVyc2VjdGlvbi55KSwgMiApKTtcbiAgICAgICAgXG4gICAgICAgIC8vVXBkYXRlIHRoZSBtaW5pbXVtIGRpc3RhbmNlXG4gICAgICAgIGlmKGRpc3QgPCBtaW5EaXN0KXtcbiAgICAgICAgICBtaW5EaXN0ID0gZGlzdDtcbiAgICAgICAgICBpbnRlcnNlY3Rpb24gPSBjdXJyZW50SW50ZXJzZWN0aW9uO1xuICAgICAgICAgIG5ld0JlbmRJbmRleCA9IGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYoaW50ZXJzZWN0aW9uICE9PSB1bmRlZmluZWQpe1xuICAgICAgbmV3QmVuZFBvaW50ID0gaW50ZXJzZWN0aW9uO1xuICAgIH1cbiAgICBcbiAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbiA9IHRoaXMuY29udmVydFRvUmVsYXRpdmVCZW5kUG9zaXRpb24oZWRnZSwgbmV3QmVuZFBvaW50KTtcbiAgICBcbiAgICBpZihpbnRlcnNlY3Rpb24gPT09IHVuZGVmaW5lZCl7XG4gICAgICByZWxhdGl2ZUJlbmRQb3NpdGlvbi5kaXN0YW5jZSA9IDA7XG4gICAgfVxuXG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XG4gICAgXG4gICAgd2VpZ2h0cyA9IHdlaWdodHM/d2VpZ2h0czpbXTtcbiAgICBkaXN0YW5jZXMgPSBkaXN0YW5jZXM/ZGlzdGFuY2VzOltdO1xuICAgIFxuICAgIGlmKHdlaWdodHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBuZXdCZW5kSW5kZXggPSAwO1xuICAgIH1cbiAgICBcbi8vICAgIHdlaWdodHMucHVzaChyZWxhdGl2ZUJlbmRQb3NpdGlvbi53ZWlnaHQpO1xuLy8gICAgZGlzdGFuY2VzLnB1c2gocmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xuICAgIGlmKG5ld0JlbmRJbmRleCAhPSAtMSl7XG4gICAgICB3ZWlnaHRzLnNwbGljZShuZXdCZW5kSW5kZXgsIDAsIHJlbGF0aXZlQmVuZFBvc2l0aW9uLndlaWdodCk7XG4gICAgICBkaXN0YW5jZXMuc3BsaWNlKG5ld0JlbmRJbmRleCwgMCwgcmVsYXRpdmVCZW5kUG9zaXRpb24uZGlzdGFuY2UpO1xuICAgIH1cbiAgIFxuICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XG4gICAgZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGRpc3RhbmNlcyk7XG4gICAgXG4gICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcbiAgICBcbiAgICByZXR1cm4gcmVsYXRpdmVCZW5kUG9zaXRpb247XG4gIH0sXG4gIHJlbW92ZUJlbmRQb2ludDogZnVuY3Rpb24oZWRnZSwgYmVuZFBvaW50SW5kZXgpe1xuICAgIGlmKGVkZ2UgPT09IHVuZGVmaW5lZCB8fCBiZW5kUG9pbnRJbmRleCA9PT0gdW5kZWZpbmVkKXtcbiAgICAgIGVkZ2UgPSB0aGlzLmN1cnJlbnRDdHhFZGdlO1xuICAgICAgYmVuZFBvaW50SW5kZXggPSB0aGlzLmN1cnJlbnRCZW5kSW5kZXg7XG4gICAgfVxuICAgIFxuICAgIHZhciBkaXN0YW5jZXMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XG4gICAgdmFyIHdlaWdodHMgPSBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycpO1xuICAgIFxuICAgIGRpc3RhbmNlcy5zcGxpY2UoYmVuZFBvaW50SW5kZXgsIDEpO1xuICAgIHdlaWdodHMuc3BsaWNlKGJlbmRQb2ludEluZGV4LCAxKTtcbiAgICBcbiAgICBcbiAgICBpZihkaXN0YW5jZXMubGVuZ3RoID09IDAgfHwgd2VpZ2h0cy5sZW5ndGggPT0gMCl7XG4gICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xuICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgW10pO1xuICAgICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nV2VpZ2h0cycsIFtdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJywgZGlzdGFuY2VzKTtcbiAgICAgIGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgd2VpZ2h0cyk7XG4gICAgfVxuICB9LFxuICBjYWxjdWxhdGVEaXN0YW5jZTogZnVuY3Rpb24ocHQxLCBwdDIpIHtcbiAgICB2YXIgZGlmZlggPSBwdDEueCAtIHB0Mi54O1xuICAgIHZhciBkaWZmWSA9IHB0MS55IC0gcHQyLnk7XG4gICAgXG4gICAgdmFyIGRpc3QgPSBNYXRoLnNxcnQoIE1hdGgucG93KCBkaWZmWCwgMiApICsgTWF0aC5wb3coIGRpZmZZLCAyICkgKTtcbiAgICByZXR1cm4gZGlzdDtcbiAgfSxcbiAgLyoqIChMZXNzIHRoYW4gb3IgZXF1YWwgdG8pIGFuZCAoZ3JlYXRlciB0aGVuIGVxdWFsIHRvKSBjb21wYXJpc29ucyB3aXRoIGZsb2F0aW5nIHBvaW50IG51bWJlcnMgKi9cbiAgY29tcGFyZVdpdGhQcmVjaXNpb246IGZ1bmN0aW9uIChuMSwgbjIsIGlzTGVzc1RoZW5PckVxdWFsID0gZmFsc2UsIHByZWNpc2lvbiA9IDAuMDEpIHtcbiAgICBjb25zdCBkaWZmID0gbjEgLSBuMjtcbiAgICBpZiAoTWF0aC5hYnMoZGlmZikgPD0gcHJlY2lzaW9uKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzTGVzc1RoZW5PckVxdWFsKSB7XG4gICAgICByZXR1cm4gbjEgPCBuMjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG4xID4gbjI7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGJlbmRQb2ludFV0aWxpdGllcztcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICAgKi9cbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IERhdGVcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XG4gICAqIH0sIF8ubm93KCkpO1xuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAqL1xuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxuICAgKlxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAqXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICAgKlxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICogICAnbGVhZGluZyc6IHRydWUsXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcbiAgICpcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xuICAgKiAgIH1cbiAgICogfSwgWydkZWxldGUnXSk7XG4gICAqXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XG4gICAqXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJncyxcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgIHN0YW1wLFxuICAgICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgICB9XG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgbGFzdENhbGxlZCA9IDA7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgIH1cbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHN0YW1wID0gbm93KCk7XG4gICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XG5cbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIHJldHVybiBkZWJvdW5jZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KHt9KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc09iamVjdCgxKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGRlYm91bmNlO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsIjsoZnVuY3Rpb24oKXsgJ3VzZSBzdHJpY3QnO1xuICBcbiAgdmFyIGJlbmRQb2ludFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vYmVuZFBvaW50VXRpbGl0aWVzJyk7XG4gIHZhciBkZWJvdW5jZSA9IHJlcXVpcmUoXCIuL2RlYm91bmNlXCIpO1xuICBcbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiggY3l0b3NjYXBlLCAkICl7XG4gICAgdmFyIHVpVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9VSVV0aWxpdGllcycpO1xuICAgIFxuICAgIGlmKCAhY3l0b3NjYXBlICl7IHJldHVybjsgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24gc3BlY2lmaWVzIHRoZSBwb2l0aW9ucyBvZiBiZW5kIHBvaW50c1xuICAgICAgYmVuZFBvc2l0aW9uc0Z1bmN0aW9uOiBmdW5jdGlvbihlbGUpIHtcbiAgICAgICAgcmV0dXJuIGVsZS5kYXRhKCdiZW5kUG9pbnRQb3NpdGlvbnMnKTtcbiAgICAgIH0sXG4gICAgICAvLyB3aGV0aGVyIHRvIGluaXRpbGl6ZSBiZW5kIHBvaW50cyBvbiBjcmVhdGlvbiBvZiB0aGlzIGV4dGVuc2lvbiBhdXRvbWF0aWNhbGx5XG4gICAgICBpbml0QmVuZFBvaW50c0F1dG9tYXRpY2FsbHk6IHRydWUsXG4gICAgICAvLyB0aGUgY2xhc3NlcyBvZiB0aG9zZSBlZGdlcyB0aGF0IHNob3VsZCBiZSBpZ25vcmVkXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW10sXG4gICAgICAvLyB3aGV0aGVyIHRoZSBiZW5kIGVkaXRpbmcgb3BlcmF0aW9ucyBhcmUgdW5kb2FibGUgKHJlcXVpcmVzIGN5dG9zY2FwZS11bmRvLXJlZG8uanMpXG4gICAgICB1bmRvYWJsZTogZmFsc2UsXG4gICAgICAvLyB0aGUgc2l6ZSBvZiBiZW5kIHNoYXBlIGlzIG9idGFpbmVkIGJ5IG11bHRpcGxpbmcgd2lkdGggb2YgZWRnZSB3aXRoIHRoaXMgcGFyYW1ldGVyXG4gICAgICBiZW5kU2hhcGVTaXplRmFjdG9yOiAzLFxuICAgICAgLy8gei1pbmRleCB2YWx1ZSBvZiB0aGUgY2FudmFzIGluIHdoaWNoIGJlbmQgcG9pbnRzIGFyZSBkcmF3blxuICAgICAgekluZGV4OiA5OTksICAgICAgXG4gICAgICAvLyB3aGV0aGVyIHRvIHN0YXJ0IHRoZSBwbHVnaW4gaW4gdGhlIGVuYWJsZWQgc3RhdGVcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAvL0FuIG9wdGlvbiB0aGF0IGNvbnRyb2xzIHRoZSBkaXN0YW5jZSB3aXRoaW4gd2hpY2ggYSBiZW5kIHBvaW50IGlzIGNvbnNpZGVyZWQgXCJuZWFyXCIgdGhlIGxpbmUgc2VnbWVudCBiZXR3ZWVuIGl0cyB0d28gbmVpZ2hib3JzIGFuZCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZFxuICAgICAgYmVuZFJlbW92YWxTZW5zaXRpdml0eSA6IDgsXG4gICAgICAvLyB0aXRsZSBvZiBhZGQgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcbiAgICAgIGFkZEJlbmRNZW51SXRlbVRpdGxlOiBcIkFkZCBCZW5kIFBvaW50XCIsXG4gICAgICAvLyB0aXRsZSBvZiByZW1vdmUgYmVuZCBwb2ludCBtZW51IGl0ZW0gKFVzZXIgbWF5IG5lZWQgdG8gYWRqdXN0IHdpZHRoIG9mIG1lbnUgaXRlbXMgYWNjb3JkaW5nIHRvIGxlbmd0aCBvZiB0aGlzIG9wdGlvbilcbiAgICAgIHJlbW92ZUJlbmRNZW51SXRlbVRpdGxlOiBcIlJlbW92ZSBCZW5kIFBvaW50XCIsXG4gICAgICAvLyB3aGV0aGVyIHRoZSBiZW5kIHBvaW50IGNhbiBiZSBtb3ZlZCBieSBhcnJvd3NcbiAgICAgIG1vdmVTZWxlY3RlZEJlbmRQb2ludHNPbktleUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdmFyIG9wdGlvbnM7XG4gICAgdmFyIGluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgY29taW5nIGZyb20gcGFyYW1ldGVyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgICB2YXIgb2JqID0ge307XG5cbiAgICAgIGZvciAodmFyIGkgaW4gZGVmYXVsdHMpIHtcbiAgICAgICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuICAgICAgICBpZihpID09IFwiYmVuZFJlbW92YWxTZW5zaXRpdml0eVwiKXtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBvcHRpb25zW2ldO1xuICAgICAgICAgICBpZighaXNOYU4odmFsdWUpKVxuICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKHZhbHVlID49IDAgJiYgdmFsdWUgPD0gMjApe1xuICAgICAgICAgICAgICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XG4gICAgICAgICAgICAgIH1lbHNlIGlmKHZhbHVlIDwgMCl7XG4gICAgICAgICAgICAgICAgb2JqW2ldID0gMFxuICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBvYmpbaV0gPSAyMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgIH1cbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgb2JqW2ldID0gb3B0aW9uc1tpXTtcbiAgICAgICAgfVxuXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICBcbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZWRnZUVkaXRpbmcnLCBmdW5jdGlvbihvcHRzKXtcbiAgICAgIHZhciBjeSA9IHRoaXM7XG4gICAgICBcbiAgICAgIGlmKCBvcHRzID09PSAnaW5pdGlhbGl6ZWQnICkge1xuICAgICAgICByZXR1cm4gaW5pdGlhbGl6ZWQ7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmKCBvcHRzICE9PSAnZ2V0JyApIHtcbiAgICAgICAgLy8gbWVyZ2UgdGhlIG9wdGlvbnMgd2l0aCBkZWZhdWx0IG9uZXNcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgb3B0cyk7XG4gICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgICAgICAvLyBkZWZpbmUgZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMgY3NzIGNsYXNzXG4gICAgICAgIGN5LnN0eWxlKCkuc2VsZWN0b3IoJy5lZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpLmNzcyh7XG4gICAgICAgICAgJ3NlZ21lbnQtZGlzdGFuY2VzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50RGlzdGFuY2VzU3RyaW5nKGVsZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY29udHJvbC1wb2ludC1kaXN0YW5jZXMnOiBmdW5jdGlvbiAoZWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnREaXN0YW5jZXNTdHJpbmcoZWxlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdzZWdtZW50LXdlaWdodHMnOiBmdW5jdGlvbiAoZWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gYmVuZFBvaW50VXRpbGl0aWVzLmdldFNlZ21lbnRXZWlnaHRzU3RyaW5nKGVsZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY29udHJvbC1wb2ludC13ZWlnaHRzJzogZnVuY3Rpb24gKGVsZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50V2VpZ2h0c1N0cmluZyhlbGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2VkZ2UtZGlzdGFuY2VzJzogJ25vZGUtcG9zaXRpb24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5zZXRJZ25vcmVkQ2xhc3NlcyhvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcblxuICAgICAgICAvLyBpbml0IGJlbmQgcG9zaXRpb25zIGNvbmRpdGlvbmFsbHlcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdEJlbmRQb2ludHNBdXRvbWF0aWNhbGx5KSB7XG4gICAgICAgICAgYmVuZFBvaW50VXRpbGl0aWVzLmluaXRCZW5kUG9pbnRzKG9wdGlvbnMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBjeS5lZGdlcygpLCBvcHRpb25zLmlnbm9yZWRDbGFzc2VzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG9wdGlvbnMuZW5hYmxlZClcbiAgICAgICAgICB1aVV0aWxpdGllcyhvcHRpb25zLCBjeSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB1aVV0aWxpdGllcyhcInVuYmluZFwiLCBjeSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciBpbnN0YW5jZSA9IGluaXRpYWxpemVkID8ge1xuICAgICAgICAvKlxuICAgICAgICAqIGdldCBzZWdtZW50IHBvaW50cyBvZiB0aGUgZ2l2ZW4gZWRnZSBpbiBhbiBhcnJheSBBLFxuICAgICAgICAqIEFbMiAqIGldIGlzIHRoZSB4IGNvb3JkaW5hdGUgYW5kIEFbMiAqIGkgKyAxXSBpcyB0aGUgeSBjb29yZGluYXRlXG4gICAgICAgICogb2YgdGhlIGl0aCBiZW5kIHBvaW50LiAoUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGN1cnZlIHN0eWxlIGlzIG5vdCBzZWdtZW50cylcbiAgICAgICAgKi9cbiAgICAgICAgZ2V0U2VnbWVudFBvaW50czogZnVuY3Rpb24oZWxlKSB7XG4gICAgICAgICAgcmV0dXJuIGJlbmRQb2ludFV0aWxpdGllcy5nZXRTZWdtZW50UG9pbnRzKGVsZSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIEluaXRpbGl6ZSBiZW5kIHBvaW50cyBmb3IgdGhlIGdpdmVuIGVkZ2VzIHVzaW5nICdvcHRpb25zLmJlbmRQb3NpdGlvbnNGdW5jdGlvbidcbiAgICAgICAgaW5pdEJlbmRQb2ludHM6IGZ1bmN0aW9uKGVsZXMpIHtcbiAgICAgICAgICBiZW5kUG9pbnRVdGlsaXRpZXMuaW5pdEJlbmRQb2ludHMob3B0aW9ucy5iZW5kUG9zaXRpb25zRnVuY3Rpb24sIGVsZXMpO1xuICAgICAgICB9LFxuICAgICAgICBkZWxldGVTZWxlY3RlZEJlbmRQb2ludDogZnVuY3Rpb24oZWxlLCBpbmRleCkge1xuICAgICAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5yZW1vdmVCZW5kUG9pbnQoZWxlLGluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfSA6IHVuZGVmaW5lZDtcblxuICAgICAgcmV0dXJuIGluc3RhbmNlOyAvLyBjaGFpbmFiaWxpdHlcbiAgICB9ICk7XG5cbiAgfTtcblxuICBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgKXsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXG4gICAgbW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlcjtcbiAgfVxuXG4gIGlmKCB0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kICl7IC8vIGV4cG9zZSBhcyBhbiBhbWQvcmVxdWlyZWpzIG1vZHVsZVxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWVkZ2UtZWRpdGluZycsIGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XG4gICAgfSk7XG4gIH1cblxuICBpZiggdHlwZW9mIGN5dG9zY2FwZSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCApeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICAgIHJlZ2lzdGVyKCBjeXRvc2NhcGUsICQgKTtcbiAgfVxuXG59KSgpO1xuIiwidmFyIHJlY29ubmVjdGlvblV0aWxpdGllcyA9IHtcblxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgYSBkdW1teSBub2RlIHdoaWNoIGlzIGNvbm5lY3RlZCB0byB0aGUgZGlzY29ubmVjdGVkIGVkZ2VcbiAgICBkaXNjb25uZWN0RWRnZTogZnVuY3Rpb24gKGVkZ2UsIGN5LCBwb3NpdGlvbiwgZGlzY29ubmVjdGVkRW5kKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgZHVtbXlOb2RlID0ge1xuICAgICAgICAgICAgZGF0YTogeyBcbiAgICAgICAgICAgICAgaWQ6ICdud3RfcmVjb25uZWN0RWRnZV9kdW1teScsXG4gICAgICAgICAgICAgIHBvcnRzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICB3aWR0aDogMSxcbiAgICAgICAgICAgICAgaGVpZ2h0OiAxLFxuICAgICAgICAgICAgICAndmlzaWJpbGl0eSc6ICdoaWRkZW4nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVuZGVyZWRQb3NpdGlvbjogcG9zaXRpb25cbiAgICAgICAgfTtcbiAgICAgICAgY3kuYWRkKGR1bW15Tm9kZSk7XG5cbiAgICAgICAgdmFyIGxvYyA9IChkaXNjb25uZWN0ZWRFbmQgPT09ICdzb3VyY2UnKSA/IFxuICAgICAgICAgICAge3NvdXJjZTogZHVtbXlOb2RlLmRhdGEuaWR9IDogXG4gICAgICAgICAgICB7dGFyZ2V0OiBkdW1teU5vZGUuZGF0YS5pZH07XG5cbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZShsb2MpWzBdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkdW1teU5vZGU6IGN5Lm5vZGVzKFwiI1wiICsgZHVtbXlOb2RlLmRhdGEuaWQpWzBdLFxuICAgICAgICAgICAgZWRnZTogZWRnZVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBjb25uZWN0RWRnZTogZnVuY3Rpb24gKGVkZ2UsIG5vZGUsIGxvY2F0aW9uKSB7XG4gICAgICAgIGlmKCFlZGdlLmlzRWRnZSgpIHx8ICFub2RlLmlzTm9kZSgpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBsb2MgPSB7fTtcbiAgICAgICAgaWYobG9jYXRpb24gPT09ICdzb3VyY2UnKVxuICAgICAgICAgICAgbG9jLnNvdXJjZSA9IG5vZGUuaWQoKTtcbiAgICAgICAgXG4gICAgICAgIGVsc2UgaWYobG9jYXRpb24gPT09ICd0YXJnZXQnKVxuICAgICAgICAgICAgbG9jLnRhcmdldCA9IG5vZGUuaWQoKTtcbiAgICAgICAgXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICByZXR1cm4gZWRnZS5tb3ZlKGxvYylbMF07XG4gICAgfSxcblxuICAgIGNvcHlFZGdlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xuICAgICAgICB0aGlzLmNvcHlCZW5kUG9pbnRzKG9sZEVkZ2UsIG5ld0VkZ2UpO1xuICAgICAgICB0aGlzLmNvcHlTdHlsZShvbGRFZGdlLCBuZXdFZGdlKTtcbiAgICB9LFxuXG4gICAgY29weVN0eWxlOiBmdW5jdGlvbiAob2xkRWRnZSwgbmV3RWRnZSkge1xuICAgICAgICBpZihvbGRFZGdlICYmIG5ld0VkZ2Upe1xuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdsaW5lLWNvbG9yJywgb2xkRWRnZS5kYXRhKCdsaW5lLWNvbG9yJykpO1xuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCd3aWR0aCcsIG9sZEVkZ2UuZGF0YSgnd2lkdGgnKSk7XG4gICAgICAgICAgICBuZXdFZGdlLmRhdGEoJ2NhcmRpbmFsaXR5Jywgb2xkRWRnZS5kYXRhKCdjYXJkaW5hbGl0eScpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjb3B5QmVuZFBvaW50czogZnVuY3Rpb24gKG9sZEVkZ2UsIG5ld0VkZ2UpIHtcbiAgICAgICAgaWYob2xkRWRnZS5oYXNDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKSl7XG4gICAgICAgICAgICB2YXIgYnBEaXN0YW5jZXMgPSBvbGRFZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XG4gICAgICAgICAgICB2YXIgYnBXZWlnaHRzID0gb2xkRWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3RWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIGJwRGlzdGFuY2VzKTtcbiAgICAgICAgICAgIG5ld0VkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJywgYnBXZWlnaHRzKTtcbiAgICAgICAgICAgIG5ld0VkZ2UuYWRkQ2xhc3MoJ2VkZ2ViZW5kZWRpdGluZy1oYXNiZW5kcG9pbnRzJyk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcbiAgXG5tb2R1bGUuZXhwb3J0cyA9IHJlY29ubmVjdGlvblV0aWxpdGllcztcbiAgIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGJlbmRQb2ludFV0aWxpdGllcywgcGFyYW1zKSB7XG4gIGlmIChjeS51bmRvUmVkbyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgdXIgPSBjeS51bmRvUmVkbyh7XG4gICAgZGVmYXVsdEFjdGlvbnM6IGZhbHNlLFxuICAgIGlzRGVidWc6IHRydWVcbiAgfSk7XG5cbiAgZnVuY3Rpb24gY2hhbmdlQmVuZFBvaW50cyhwYXJhbSkge1xuICAgIHZhciBlZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQocGFyYW0uZWRnZS5pZCgpKTtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgZWRnZTogZWRnZSxcbiAgICAgIHdlaWdodHM6IHBhcmFtLnNldCA/IGVkZ2UuZGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJykgOiBwYXJhbS53ZWlnaHRzLFxuICAgICAgZGlzdGFuY2VzOiBwYXJhbS5zZXQgPyBlZGdlLmRhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJykgOiBwYXJhbS5kaXN0YW5jZXMsXG4gICAgICBzZXQ6IHRydWUvL0FzIHRoZSByZXN1bHQgd2lsbCBub3QgYmUgdXNlZCBmb3IgdGhlIGZpcnN0IGZ1bmN0aW9uIGNhbGwgcGFyYW1zIHNob3VsZCBiZSB1c2VkIHRvIHNldCB0aGUgZGF0YVxuICAgIH07XG5cbiAgICB2YXIgaGFzQmVuZCA9IHBhcmFtLndlaWdodHMgJiYgcGFyYW0ud2VpZ2h0cy5sZW5ndGggPiAwO1xuXG4gICAgLy9DaGVjayBpZiB3ZSBuZWVkIHRvIHNldCB0aGUgd2VpZ2h0cyBhbmQgZGlzdGFuY2VzIGJ5IHRoZSBwYXJhbSB2YWx1ZXNcbiAgICBpZiAocGFyYW0uc2V0KSB7XG4gICAgICBoYXNCZW5kID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ1dlaWdodHMnLCBwYXJhbS53ZWlnaHRzKSA6IGVkZ2UucmVtb3ZlRGF0YSgnY3llZGdlYmVuZGVkaXRpbmdXZWlnaHRzJyk7XG4gICAgICBoYXNCZW5kID8gZWRnZS5kYXRhKCdjeWVkZ2ViZW5kZWRpdGluZ0Rpc3RhbmNlcycsIHBhcmFtLmRpc3RhbmNlcykgOiBlZGdlLnJlbW92ZURhdGEoJ2N5ZWRnZWJlbmRlZGl0aW5nRGlzdGFuY2VzJyk7XG5cbiAgICAgIC8vcmVmcmVzaCB0aGUgY3VydmUgc3R5bGUgYXMgdGhlIG51bWJlciBvZiBiZW5kIHBvaW50IHdvdWxkIGJlIGNoYW5nZWQgYnkgdGhlIHByZXZpb3VzIG9wZXJhdGlvblxuICAgICAgaWYgKGhhc0JlbmQpIHtcbiAgICAgICAgZWRnZS5hZGRDbGFzcygnZWRnZWJlbmRlZGl0aW5nLWhhc2JlbmRwb2ludHMnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdlZGdlYmVuZGVkaXRpbmctaGFzYmVuZHBvaW50cycpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBlZGdlLnRyaWdnZXIoJ2N5ZWRnZWJlbmRlZGl0aW5nLmNoYW5nZUJlbmRQb2ludHMnKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlRG8oYXJnKSB7XG4gICAgICBpZiAoYXJnLmZpcnN0VGltZSkge1xuICAgICAgICAgIGRlbGV0ZSBhcmcuZmlyc3RUaW1lO1xuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICB9XG5cbiAgICAgIHZhciBlZGdlcyA9IGFyZy5lZGdlcztcbiAgICAgIHZhciBwb3NpdGlvbkRpZmYgPSBhcmcucG9zaXRpb25EaWZmO1xuICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICBlZGdlczogZWRnZXMsXG4gICAgICAgICAgcG9zaXRpb25EaWZmOiB7XG4gICAgICAgICAgICAgIHg6IC1wb3NpdGlvbkRpZmYueCxcbiAgICAgICAgICAgICAgeTogLXBvc2l0aW9uRGlmZi55XG4gICAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIG1vdmVCZW5kUG9pbnRzVW5kb2FibGUocG9zaXRpb25EaWZmLCBlZGdlcyk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlQmVuZFBvaW50c1VuZG9hYmxlKHBvc2l0aW9uRGlmZiwgZWRnZXMpIHtcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oIGVkZ2UgKXtcbiAgICAgICAgICBlZGdlID0gY3kuZ2V0RWxlbWVudEJ5SWQocGFyYW0uZWRnZS5pZCgpKTtcbiAgICAgICAgICB2YXIgcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb24gPSBiZW5kUG9pbnRVdGlsaXRpZXMuZ2V0U2VnbWVudFBvaW50cyhlZGdlKTtcbiAgICAgICAgICB2YXIgbmV4dEJlbmRQb2ludHNQb3NpdGlvbiA9IFtdO1xuICAgICAgICAgIGlmIChwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbiAhPSB1bmRlZmluZWQpXG4gICAgICAgICAge1xuICAgICAgICAgICAgICBmb3IgKGk9MDsgaTxwcmV2aW91c0JlbmRQb2ludHNQb3NpdGlvbi5sZW5ndGg7IGkrPTIpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIG5leHRCZW5kUG9pbnRzUG9zaXRpb24ucHVzaCh7eDogcHJldmlvdXNCZW5kUG9pbnRzUG9zaXRpb25baV0rcG9zaXRpb25EaWZmLngsIHk6IHByZXZpb3VzQmVuZFBvaW50c1Bvc2l0aW9uW2krMV0rcG9zaXRpb25EaWZmLnl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlZGdlLmRhdGEoJ2JlbmRQb2ludFBvc2l0aW9ucycsbmV4dEJlbmRQb2ludHNQb3NpdGlvbik7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGJlbmRQb2ludFV0aWxpdGllcy5pbml0QmVuZFBvaW50cyhwYXJhbXMuYmVuZFBvc2l0aW9uc0Z1bmN0aW9uLCBlZGdlcyk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvbm5lY3RFZGdlKHBhcmFtKXtcbiAgICB2YXIgZWRnZSAgICAgID0gcGFyYW0uZWRnZTtcbiAgICB2YXIgbG9jYXRpb24gID0gcGFyYW0ubG9jYXRpb247XG4gICAgdmFyIG9sZExvYyAgICA9IHBhcmFtLm9sZExvYztcblxuICAgIGVkZ2UgPSBlZGdlLm1vdmUobG9jYXRpb24pWzBdO1xuXG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgIGVkZ2U6ICAgICBlZGdlLFxuICAgICAgbG9jYXRpb246IG9sZExvYyxcbiAgICAgIG9sZExvYzogICBsb2NhdGlvblxuICAgIH1cbiAgICBlZGdlLnVuc2VsZWN0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVJlY29ubmVjdGVkRWRnZShwYXJhbSl7XG4gICAgdmFyIG9sZEVkZ2UgPSBwYXJhbS5vbGRFZGdlO1xuICAgIHZhciB0bXAgPSBjeS5nZXRFbGVtZW50QnlJZChvbGRFZGdlLmRhdGEoJ2lkJykpO1xuICAgIGlmKHRtcCAmJiB0bXAubGVuZ3RoID4gMClcbiAgICAgIG9sZEVkZ2UgPSB0bXA7XG5cbiAgICB2YXIgbmV3RWRnZSA9IHBhcmFtLm5ld0VkZ2U7XG4gICAgdmFyIHRtcCA9IGN5LmdldEVsZW1lbnRCeUlkKG5ld0VkZ2UuZGF0YSgnaWQnKSk7XG4gICAgaWYodG1wICYmIHRtcC5sZW5ndGggPiAwKVxuICAgICAgbmV3RWRnZSA9IHRtcDtcblxuICAgIGlmKG9sZEVkZ2UuaW5zaWRlKCkpe1xuICAgICAgb2xkRWRnZSA9IG9sZEVkZ2UucmVtb3ZlKClbMF07XG4gICAgfSBcbiAgICAgIFxuICAgIGlmKG5ld0VkZ2UucmVtb3ZlZCgpKXtcbiAgICAgIG5ld0VkZ2UgPSBuZXdFZGdlLnJlc3RvcmUoKTtcbiAgICAgIG5ld0VkZ2UudW5zZWxlY3QoKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIG9sZEVkZ2U6IG5ld0VkZ2UsXG4gICAgICBuZXdFZGdlOiBvbGRFZGdlXG4gICAgfTtcbiAgfVxuXG4gIHVyLmFjdGlvbignY2hhbmdlQmVuZFBvaW50cycsIGNoYW5nZUJlbmRQb2ludHMsIGNoYW5nZUJlbmRQb2ludHMpO1xuICB1ci5hY3Rpb24oJ21vdmVCZW5kUG9pbnRzJywgbW92ZURvLCBtb3ZlRG8pO1xuICB1ci5hY3Rpb24oJ3JlY29ubmVjdEVkZ2UnLCByZWNvbm5lY3RFZGdlLCByZWNvbm5lY3RFZGdlKTtcbiAgdXIuYWN0aW9uKCdyZW1vdmVSZWNvbm5lY3RlZEVkZ2UnLCByZW1vdmVSZWNvbm5lY3RlZEVkZ2UsIHJlbW92ZVJlY29ubmVjdGVkRWRnZSk7XG59O1xuIl19
