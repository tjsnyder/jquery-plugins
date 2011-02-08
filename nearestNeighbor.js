/**
 * jQuery nearestElement - A plugin to find the nearest element on a page
 * from a given x, y location
 *
 * Examples: $("A").nearestElement(); 
 *              - initialize tree for searching or refresh if positions change
 *           $("A").nearestElement('find', x, y); 
 *              - find nearest element in set, will initialize if required
 *           $("A").nearestElement('fullScan', x, y);
 *              - for small amounts of values or constantly changing positions
 * Date: 1/20/2011
 * @author Tim Snyder
 * @version 1.0
 *
 */

(function($) {

   var functions = {
   
      /**
       * Initializes the quadtree for this element if it doesn't already exist.
       * Can be called on a set of elements at any time before needed.
       */
      buildTree: function() {
         var elements = new Array();
         this.each(function() {
            elements.push($(this));
         });
         
         var viewingRect = nn.documentWindow();
         this.data('root', nn.quadtree(elements, viewingRect));
      },
      
      /**
       * Find the nearest element in the set of elements from a given point
       * Checks against each element in real-time and thus is an O(n) search.
       * This can be used for any kind of dynamic links that may be resizing 
       * often where constantly refreshing the partition tree is costly.
       *
       * x - x position to search from
       * y - y position to search from
       * @return $element the closest element to x,y
       */
      fullScan: function (x, y) {
         var min_dist = Number.POSITIVE_INFINITY;
         var $closestElem = null;
      
         this.each(function() {
            var $e = $(this);
            var rect = nn.boundingBox($e);
            var dist = nn.distanceToRectangle(rect, x, y);
            if (dist < min_dist) {
               min_dist = dist;
               $closestElem = $e;
            }     
         });
      
         return $closestElem;
      },
      
      /**
       * Find the nearest element in the set of elements from a given point
       * Uses a quadtree that has been initialized on this set of elements.
       * If not, it will initialize the tree first.
       *
       * x - x position to search from
       * y - y position to search from
       * @return $element the closest element to x,y
       */
      find: function(x, y) {
         var root = this.data('root')
         if (!root) {
            functions.buildTree.apply(this);
            root = this.data('root');
         }
         var node = nn.nearestNeighbor(root, x, y);
         if (node) {
            return node.element;
         } else {
            return null;
         }
      }
   };
   
   var nn = {
      /**
       * Quadrants available
       */
      Quadrant: {
         NW : 'NW',
         NE : 'NE',
         SW : 'SW',
         SE : 'SE'
      },
      
      /**
       * Find the nearest element in the set of elements from a given point
       * Uses a quadtree that has been initialized on this set of elements.
       * If not, it will initialize the tree first.
       *
       * elements - elements to build a quadtree from
       * rectangle - area to initialize quadtree from
       * @return Head node
       */
      quadtree: function (elements, rectangle) {
         if (!elements || elements.length == 0)
            return null;
         
         var root = new Node(rectangle);
         
         for (var i = 0; i < elements.length; i ++) {
            var element = new Element(elements[i]);
            nn.addElement(root, element);
         }
         return root;
      },
      
      /**
       * Calculate the pythagorean distance between two points
       *
       * x0 - X coordinate of point 0
       * y0 - y coordinate of point 0
       * x1 - X coordinate of point 1
       * y1 - y coordinate of point 1
       * @return distance between x0, y0  and x1, y1
       */      
       pythagoreanDistance: function (x0, y0, x1, y1) {
         var a = y1 - y0;
         var b = x1 - x0;
      
         return Math.sqrt(a * a + b * b);
      },
      
      /**
       * Calculates the the elements bounding rectangle excluding borders
       *
       * $elem - element to calculate bounding box around
       * @return rectangle with properties top, left, right, bottom
       */
      boundingBox: function ($elem) {
         var rectangle = new Rectangle();
         rectangle.left = $elem.position().left;
         rectangle.right = rectangle.left + $elem.innerWidth();
         rectangle.top = $elem.position().top;
         rectangle.bottom = rectangle.top + $elem.innerHeight();
         
         return rectangle;
      },
      
      /**
       * Calculates the document viewing window
       *
       * @return Rectangle of the document object
       */
      documentWindow: function() {
         var viewingRect = new Rectangle();
         viewingRect.left = 0;
         viewingRect.top = 0;
         viewingRect.right = $(document).width();
         viewingRect.bottom = $(document).height();
         
         return viewingRect;
      },

      /**
       * Calculates the given distance to the rectangle from the given point
       *
       * rect - rectangle of the element
       * x - x coordinate of point
       * y - y coordinate of point
       * @return shortest distance between the rectangle and point x, y
       */ 
      distanceToRectangle: function (rect, x, y) {
         var d = null;
         if (x >= rect.left && x <= rect.right) {
            d = Math.min(Math.abs(y - rect.bottom), Math.abs(rect.top - y));
         } else if (y >= rect.top && y <= rect.bottom) {
            d = Math.min(Math.abs(x - rect.right), Math.abs(rect.left - x));
         } else if (y >= rect.bottom && x >= rect.right) {
            d = nn.pythagoreanDistance(x, y, rect.right, rect.bottom);
         } else if (y >= rect.bottom && x <= rect.left) {
            d = nn.pythagoreanDistance(x, y, rect.left, rect.bottom);
         } else if (y <= rect.top && x >= rect.right) {
            d = nn.pythagoreanDistance(x, y, rect.right, rect.top);
         } else if (y <= rect.top && x <= rect.left) {
            d = nn.pythagoreanDistance(x, y, rect.left, rect.top);
         }
         
         return d;
      },
      
      /**
       * Adds a given element to the quadtree
       *
       * node - node to search from or root
       * element - element to add to tree
       */       
      addElement: function(node, element) {
         var boundry = node.rectangle;
         var xDiv = boundry.left + (boundry.right - boundry.left) / 2;
         var yDiv = boundry.top + (boundry.bottom - boundry.top) / 2;
         var rect = element.rectangle;
         
         if (rect.bottom < yDiv && rect.right < xDiv) {
            if (!node.nw)
               node.nw = new Node(nn.getQuadrant(boundry, nn.Quadrant.NW));
            nn.addElement(node.nw, element);
         } else if (rect.bottom < yDiv && rect.left > xDiv) {
            if (!node.ne)
               node.ne = new Node(nn.getQuadrant(boundry, nn.Quadrant.NE));
            nn.addElement(node.ne, element);
         } else if (rect.top > yDiv && rect.right < xDiv) {
            if (!node.sw)
               node.sw = new Node(nn.getQuadrant(boundry, nn.Quadrant.SW));
            nn.addElement(node.sw, element);
         } else if (rect.top > yDiv && rect.left > xDiv) {
            if (!node.se) 
               node.se = new Node(nn.getQuadrant(boundry, nn.Quadrant.SE));
            nn.addElement(node.se, element);
         } else {
            node.elements.push(element);
         }
      },
      
      /**
       * Search for the nearest neighbor from a given point 
       *
       * quadtree - tree to search
       * x - x coordinate of point
       * y - y coordinate of point
       * @return closest matched element;
       */
      nearestNeighbor: function(quadtree, x, y, best) {
         if (!quadtree)
            return null;
            
         if (!best)
            best = new Node();

         if (quadtree.elements.length > 0) {
            var bestInQuad = nn.getMinDistance(quadtree.elements, x, y);
            if (bestInQuad.distance < best.distance) {
               best = bestInQuad;
            }
         }
         var pointQuad = nn.quadWithPoint(quadtree.rectangle, x, y);
         if (quadtree.nw) {
            var quadDistance = nn.distanceToRectangle(quadtree.nw.rectangle, x, y);
            if  (pointQuad == nn.Quadrant.NW || quadDistance < best.distance)
               best = nn.nearestNeighbor(quadtree.nw, x, y, best);
         }
         if (quadtree.ne) {
            quadDistance = nn.distanceToRectangle(quadtree.ne.rectangle, x, y);
            if  (pointQuad == nn.Quadrant.NE || quadDistance < best.distance)
               best = nn.nearestNeighbor(quadtree.ne, x, y, best);
         }
         if (quadtree.sw) {
            quadDistance = nn.distanceToRectangle(quadtree.sw.rectangle, x, y);
            if  (pointQuad == nn.Quadrant.SW || quadDistance < best.distance)
               best = nn.nearestNeighbor(quadtree.sw, x, y, best);
         }
         if (quadtree.se) {
            quadDistance = nn.distanceToRectangle(quadtree.se.rectangle, x, y);
            if  (pointQuad == nn.Quadrant.SE || quadDistance < best.distance)
               best = nn.nearestNeighbor(quadtree.se, x, y, best);
         }
         return best;
      },
      
      /**
       * Determine which quadrant a point is in from a given rectangle
       *
       * rectangle - rectangle to create quadrants from
       * x - x coordinate of point
       * y - y coordinate of point
       * @return Quadrant
       */
      quadWithPoint: function(rectangle, x, y) {
         var nw = nn.getQuadrant(rectangle, nn.Quadrant.NW);
         var quad = null;
         if (x <= nw.right && y <= nw.bottom) {
            quad = nn.Quadrant.NW;
         } else if (x > nw.right && y <= nw.bottom) {
            quad = nn.Quadrant.NE;
         } else if (x <= nw.right && y > nw.bottom) {
            quad = nn.Quadrant.SW;
         } else if (x > nw.right && y > nw.bottom) {
            quad = nn.Quadrant.SE;
         }
         return quad;
      },
      
      /**
       * Find the minimum distance in a set of nodes
       *
       * nodes - array of nodes
       * x - x coordinate of point
       * y - y coordinate of point
       * @return Node with shortest distance
       */
      getMinDistance: function(nodes, x, y) {
         var min = Number.POSITIVE_INFINITY;
         var best = null;
         for (var i = 0; i < nodes.length; i++) {
            var d = nn.distanceToRectangle(nodes[i].rectangle, x, y);
            nodes[i].distance = d;
            
            if (d < min) {
               min = d;
               best = nodes[i];
            }
         }
         return best;
      },
      
      /**
       * get a specified quadrant
       *
       * rectangle - rectangle to get quadrant from
       * quadrant - which quadrant to return
       * @return rectangle of specified quadrant
       */
      getQuadrant: function(rectangle, quadrant) {
         var quad = new Rectangle();
         
         switch (quadrant) {
            case nn.Quadrant.NW:
               quad.left = rectangle.left;
               quad.right = rectangle.left + (rectangle.right - rectangle.left) / 2;
               quad.top = rectangle.top;
               quad.bottom = rectangle.top + (rectangle.bottom - rectangle.top) / 2;
               break;
            case nn.Quadrant.NE:
               quad.left = rectangle.left + (rectangle.right - rectangle.left) / 2;
               quad.right = rectangle.right;
               quad.top = rectangle.top;
               quad.bottom = rectangle.top + (rectangle.bottom - rectangle.top) / 2;
               break;
            case nn.Quadrant.SW:
               quad.left = rectangle.left;
               quad.right = rectangle.left + (rectangle.right - rectangle.left) / 2;
               quad.top = rectangle.top + (rectangle.bottom - rectangle.top) / 2;
               quad.bottom = rectangle.bottom;
               break;
            case nn.Quadrant.SE:
               quad.left = rectangle.left + (rectangle.right - rectangle.left) / 2;
               quad.right = rectangle.right;
               quad.top = rectangle.top + (rectangle.bottom - rectangle.top) / 2;
               quad.bottom = rectangle.bottom;
               break;
         }
         
         return quad;
      }
   };
   
   /**
    * Element object container
    *
    * element - jquery element
    */
   function Element(element) {
      this.element = element;
      this.rectangle = nn.boundingBox(element)
   }
   
   /**
    * Node in a quadtree
    *
    * rectangle - defined rectangle of this node
    */
   function Node(rectangle) {
      this.rectangle = rectangle;
      this.distance = Number.POSITIVE_INFINITY;
      this.elements = new Array();
      this.nw = null;
      this.ne = null;
      this.sw = null;
      this.se = null;
   }
   
   /**
    * Rectangle
    *
    * top - upper y of rectangle
    * left - lower x of rectangle
    * bottom - lower y of rectangle
    * right - upper x of rectangle
    */
   function Rectangle(top, left, bottom, right) {
      this.top = top;
      this.left = left;
      this.bottom = bottom;
      this.right = right;
   }
   
   /**
     * Nearest element jQuery hook
     */
   $.fn.nearestElement = function(fn) {
      if (functions[fn]) {
         return functions[fn].apply(this, Array.prototype.slice.call(arguments,1));
      } else if (!fn) {
         return functions.buildTree.apply(this);
      } else {
         $.error('Function ' +  fn + ' does not exist on jQuery.nearestElement');
      }
   };
   
})(jQuery);
