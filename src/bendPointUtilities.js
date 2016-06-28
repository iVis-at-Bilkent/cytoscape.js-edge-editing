var bendPointUtilities = {
  currentCtxEdge: undefined,
  currentCtxPos: undefined,
  currentBendIndex: undefined,
  // initilize bend points based on bendPositionsFcn
  initBendPoints: function(bendPositionsFcn) {
    var edges = cy.edges();

    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      
      // get the bend positions by applying the function for this edge
      var bendPositions = bendPositionsFcn.apply(this, edge);
      // calculate relative bend positions
      var result = this.convertToRelativeBendPositions(edge, bendPositions);

      // if there are bend points set weights and distances accordingly and add class to enable style changes
      if (result.distances.length > 0) {
        edge.data('weights', result.weights);
        edge.data('distances', result.distances);
        edge.addClass('edgebendediting-hasbendpoints');
      }
    }
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
  convertToRelativeBendPosition: function (edge, bendPoint, srcTgtPointsAndTangents) {
    if (srcTgtPointsAndTangents === undefined) {
      srcTgtPointsAndTangents = this.getSrcTgtPointsAndTangents(edge);
    }
    
    var intersectionPoint = this.getIntersection(edge, bendPoint, srcTgtPointsAndTangents);
    var intersectX = intersectionPoint.x;
    var intersectY = intersectionPoint.y;
    
    var srcPoint = srcTgtPointsAndTangents.srcPoint;
    var tgtPoint = srcTgtPointsAndTangents.tgtPoint;
    
    var weight = intersectX == srcPoint.x?0:(intersectX - srcPoint.x) / (tgtPoint.x - srcPoint.x);
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
    
    var minDiff = 0.001;
    
    if(Math.abs(weight - 0) < minDiff){
      weight = minDiff;
    }
    else if(Math.abs(weight - 1) < minDiff){
      weight = 1 - minDiff;
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

    var distances = edge.data('distances');
    for (var i = 0; i < distances.length; i++) {
      str = str + " " + distances[i];
    }
    
    return str;
  },
  getSegmentWeightsString: function (edge) {
    var str = "";

    var weights = edge.data('weights');
    for (var i = 0; i < weights.length; i++) {
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
    
    var edgeStartX = edge._private.rscratch.startX;
    var edgeStartY = edge._private.rscratch.startY;
    var edgeEndX = edge._private.rscratch.endX;
    var edgeEndY = edge._private.rscratch.endY;
    
    var startWeight = this.convertToRelativeBendPosition(edge, {x: edgeStartX, y: edgeStartY}).weight;
    var endWeight = this.convertToRelativeBendPosition(edge, {x: edgeEndX, y: edgeEndY}).weight;
    var weightsWithTgtSrc = [startWeight].concat(edge.data('weights')?edge.data('weights'):[]).concat([endWeight]);
    
    var minDist = Infinity;
    var intersection;
    var segptsWithTgtSrc = [edgeStartX, edgeStartY]
            .concat(edge._private.rscratch.segpts?edge._private.rscratch.segpts:[])
            .concat([edgeEndX, edgeEndY]);
    var newBendIndex = -1;
    
    for(var i = 0; i < weightsWithTgtSrc.length - 1; i++){
      var w1 = weightsWithTgtSrc[i];
      var w2 = weightsWithTgtSrc[i + 1];
      
      //check if the weight is between w1 and w2
      if((originalPointWeight <= w1 && originalPointWeight >= w2) || (originalPointWeight <= w2 && originalPointWeight >= w1)){
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

    var weights = edge.data('weights');
    var distances = edge.data('distances');
    
    weights = weights?weights:[];
    distances = distances?distances:[];
    
//    weights.push(relativeBendPosition.weight);
//    distances.push(relativeBendPosition.distance);
    if(newBendIndex != -1){
      weights.splice(newBendIndex, 0, relativeBendPosition.weight);
      distances.splice(newBendIndex, 0, relativeBendPosition.distance);
    }
    
    edge.data('weights', weights);
    edge.data('distances', distances);
    edge.css('curve-style', 'segments');
    
    return relativeBendPosition;
  },
  removeBendPoint: function(edge, bendPointIndex){
    if(edge === undefined || bendPointIndex === undefined){
      edge = this.currentCtxEdge;
      bendPointIndex = this.currentBendIndex;
    }
    
    var distances = edge.data('distances');
    var weights = edge.data('weights');
    
    distances.splice(bendPointIndex, 1);
    weights.splice(bendPointIndex, 1);
    
    if(distances.length == 0 || weights.lenght == 0){
      edge.removeData('distances');
      edge.removeData('weights');
      edge._private.rscratch.segpts = [];
      edge.css('curve-style', 'bezier');
    }
    else {
      edge.data('distances', distances);
      edge.data('weights', weights);
    }
  }
};

module.exports = bendPointUtilities;