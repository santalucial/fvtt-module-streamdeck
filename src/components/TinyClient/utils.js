import { SORT_INTEGER_DENSITY } from "./constants";
/**
 * Update a source object by replacing its keys and values with those from a target object.
 *
 * @param {Object} original     The initial object which should be updated with values from the target
 * @param {Object} other        A new object whose values should replace those in the source
 * @param {boolean} insert      Control whether to insert new parent objects in the structure which did not previously
 *                              exist in the source object.
 * @param {boolean} overwrite   Control whether to replace existing values in the source, or only merge values which
 *                              do not exist in the source.
 * @param {boolean} inplace     Update the values of original inplace? Otherwise duplicate the original and return a
 *                              safe copy.
 * @param {boolean} enforceTypes  Enforce that the type of an inner value in the source object match the type of the
 *                              new value. Default is false for now, but should be true in the future.
 * @param {number} _d           A privately used parameter to track recursion depth
 *
 * @returns {Object}            The original source object including updated, inserted, or overwritten records.
 */
export function mergeObject(
  original,
  other = {},
  {
    insertKeys = true,
    insertValues = true,
    overwrite = true,
    inplace = true,
    enforceTypes = false,
  } = {},
  _d = 0
) {
  other = other || {};
  if (!(original instanceof Object) || !(other instanceof Object)) {
    throw new Error("One of original or other are not Objects!");
  }
  let depth = _d + 1;

  // Maybe copy the original data at depth 0
  if (!inplace && _d === 0) original = duplicate(original);

  // Enforce object expansion at depth 0
  if (_d === 0 && Object.keys(original).some((k) => /\./.test(k)))
    original = expandObject(original);
  if (_d === 0 && Object.keys(other).some((k) => /\./.test(k)))
    other = expandObject(other);

  // Iterate over the other object
  for (let [k, v] of Object.entries(other)) {
    let tv = getType(v);

    // Prepare to delete
    let toDelete = false;
    if (k.startsWith("-=")) {
      k = k.slice(2);
      toDelete = v === null;
    }

    // Get the existing object
    let x = original[k];
    let has = original.hasOwnProperty(k);
    let tx = getType(x);

    // Ensure that inner objects exist
    if (!has && tv === "Object") {
      x = original[k] = {};
      has = true;
      tx = "Object";
    }

    // Case 1 - Key exists
    if (has) {
      // 1.1 - Recursively merge an inner object
      if (tv === "Object" && tx === "Object") {
        mergeObject(
          x,
          v,
          {
            insertKeys: insertKeys,
            insertValues: insertValues,
            overwrite: overwrite,
            inplace: true,
            enforceTypes: enforceTypes,
          },
          depth
        );
      }

      // 1.2 - Remove an existing key
      else if (toDelete) {
        delete original[k];
      }

      // 1.3 - Overwrite existing value
      else if (overwrite) {
        if (tx && tv !== tx && enforceTypes) {
          throw new Error(
            `Mismatched data types encountered during object merge.`
          );
        }
        original[k] = v;
      }

      // 1.4 - Insert new value
      else if (x === undefined && insertValues) {
        original[k] = v;
      }
    }

    // Case 2 - Key does not exist
    else if (!toDelete) {
      let canInsert =
        (depth === 1 && insertKeys) || (depth > 1 && insertValues);
      if (canInsert) original[k] = v;
    }
  }

  // Return the object for use
  return original;
}

/**
 * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
 * inner objects.
 *
 * @param {Object} obj  The object to expand
 * @param {Number} _d   Recursion depth, to prevent overflow
 * @return {Object}     An expanded object
 */
export function expandObject(obj, _d = 0) {
  const expanded = {};
  if (_d > 10) throw new Error("Maximum depth exceeded");
  for (let [k, v] of Object.entries(obj)) {
    if (v instanceof Object && !Array.isArray(v)) v = expandObject(v, _d + 1);
    setProperty(expanded, k, v);
  }
  return expanded;
}

/**
 * A helper function which searches through an object to assign a value using a string key
 * This string key supports the notation a.b.c which would target object[a][b][c]
 *
 * @param object {Object}   The object to update
 * @param key {String}      The string key
 * @param value             The value to be assigned
 *
 * @return {Boolean}        A flag for whether or not the object was updated
 */
export function setProperty(object, key, value) {
  let target = object;
  let changed = false;

  // Convert the key to an object reference if it contains dot notation
  if (key.indexOf(".") !== -1) {
    let parts = key.split(".");
    key = parts.pop();
    target = parts.reduce((o, i) => {
      if (!o.hasOwnProperty(i)) o[i] = {};
      return o[i];
    }, object);
  }

  // Update the target
  if (target[key] !== value) {
    changed = true;
    target[key] = value;
  }

  // Return changed status
  return changed;
}

/**
 * A cheap data duplication trick, surprisingly relatively performant
 * @param {Object} original   Some sort of data
 */
export function duplicate(original) {
  return JSON.parse(JSON.stringify(original));
}

/* -------------------------------------------- */

/**
 * Learn the named type of a token - extending the functionality of typeof to recognize some core Object types
 * @param {*} token     Some passed token
 * @return {string}     The named type of the token
 */
export function getType(token) {
  const tof = typeof token;
  if (tof === "object") {
    if (token === null) return "null";
    let cn = token.constructor.name;
    if (["String", "Number", "Boolean", "Array", "Set"].includes(cn)) return cn;
    else if (/^HTML/.test(cn)) return "HTMLElement";
    else return "Object";
  }
  return tof;
}

export function diffObject(original, other) {
  function _difference(v0, v1) {
    let t0 = getType(v0);
    let t1 = getType(v1);
    if (t0 !== t1) return [true, v1];
    if (t0 === "Array") return [!v0.equals(v1), v1];
    if (t0 === "Object") {
      if (isObjectEmpty(v0) !== isObjectEmpty(v1)) return [true, v1];
      let d = diffObject(v0, v1);
      return [!isObjectEmpty(d), d];
    }
    return [v0 !== v1, v1];
  }

  // Recursively call the _difference function
  return Object.keys(other).reduce((obj, key) => {
    let [isDifferent, difference] = _difference(original[key], other[key]);
    if (isDifferent) obj[key] = difference;
    return obj;
  }, {});
}

/**
 * A simple function to test whether or not an Object is empty
 * @param {Object} obj    The object to test
 * @return {Boolean}      Is the object empty?
 */
export function isObjectEmpty(obj) {
  if (getType(obj) !== "Object")
    throw new Error("The provided data is not an object!");
  return Object.keys(obj).length === 0;
}

export class SortingHelpers {
  /**
   * Given a source object to sort, a target to sort relative to, and an Array of siblings in the container:
   * Determine the updated sort keys for the source object, or all siblings if a reindex is required.
   * Return an Array of updates to perform, it is up to the caller to dispatch these updates.
   * Each update is structured as:
   * {
   *   target: object,
   *   update: {sortKey: sortValue}
   * }
   *
   * @param {*} source            The source object being sorted
   * @param {*} target            The target object relative which to sort
   * @param {Array} siblings      The sorted Array of siblings which share the same sorted container
   * @param {String} sortKey      The name of the data property within the source object which defines the sort key
   * @param {Boolean} sortBefore  Whether to sort before the target (if true) or after (if false)
   *
   * @returns {Array}             An Array of updates for the caller of the helper function to perform
   */
  static performIntegerSort(
    source,
    { target = null, siblings = [], sortKey = "sort", sortBefore = true } = {}
  ) {
    // Ensure the siblings are sorted
    siblings.sort((a, b) => a.data[sortKey] - b.data[sortKey]);

    // Determine the index target for the sort
    let defaultIdx = sortBefore ? siblings.length : 0;
    let idx = target ? siblings.findIndex((sib) => sib === target) : defaultIdx;

    // Determine the indices to sort between
    let min, max;
    if (sortBefore) [min, max] = this._sortBefore(siblings, idx, sortKey);
    else [min, max] = this._sortAfter(siblings, idx, sortKey);

    // Easiest case - no siblings
    if (siblings.length === 0) {
      return [
        {
          target: source,
          update: { [sortKey]: SORT_INTEGER_DENSITY },
        },
      ];
    }

    // No minimum - sort to beginning
    else if (Number.isFinite(max) && min === null) {
      return [
        {
          target: source,
          update: { [sortKey]: max - SORT_INTEGER_DENSITY },
        },
      ];
    }

    // No maximum - sort to end
    else if (Number.isFinite(min) && max === null) {
      return [
        {
          target: source,
          update: { [sortKey]: min + SORT_INTEGER_DENSITY },
        },
      ];
    }

    // Sort between two
    else if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Math.abs(max - min) > 1
    ) {
      return [
        {
          target: source,
          update: { [sortKey]: Math.round(0.5 * (min + max)) },
        },
      ];
    }

    // Reindex all siblings
    else {
      siblings.splice(idx, 0, source);
      return siblings.map((sib, i) => {
        return {
          target: sib,
          update: { [sortKey]: (i + 1) * SORT_INTEGER_DENSITY },
        };
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Given an ordered Array of siblings and a target position, return the [min,max] indices to sort before the target
   * @private
   */
  static _sortBefore(siblings, idx, sortKey) {
    let max = siblings[idx] ? siblings[idx].data[sortKey] : null;
    let min = siblings[idx - 1] ? siblings[idx - 1].data[sortKey] : null;
    return [min, max];
  }

  /* -------------------------------------------- */

  /**
   * Given an ordered Array of siblings and a target position, return the [min,max] indices to sort after the target
   * @private
   */
  static _sortAfter(siblings, idx, sortKey) {
    let min = siblings[idx] ? siblings[idx].data[sortKey] : null;
    let max = siblings[idx + 1] ? siblings[idx + 1].data[sortKey] : null;
    return [min, max];
  }

  /* -------------------------------------------- */
}

export function getProperty(object, key) {
  if (!key) return undefined;
  let target = object;
  for (let p of key.split(".")) {
    target = target || {};
    if (p in target) target = target[p];
    else return undefined;
  }
  return target;
}

export function hasProperty(object, key) {
  if (!key) return false;
  let target = object;
  for (let p of key.split(".")) {
    target = target || {};
    if (p in target) target = target[p];
    else return false;
  }
  return true;
}

/**
 * A ray for the purposes of computing sight and collision
 * Given points A[x,y] and B[x,y]
 *
 * Slope-Intercept form:
 * y = a + bx
 * y = A.y + ((B.y - A.Y) / (B.x - A.x))x
 *
 * Parametric form:
 * R(t) = (1-t)A + tB
 *
 * @param {{x: number, y: number}} A      The origin of the Ray
 * @param {{x: number, y: number}} B      The destination of the Ray
 */
export class Ray {
  constructor(A, B) {
    // Store points
    this.A = A;
    this.B = B;

    // Origins
    this.y0 = A.y;
    this.x0 = A.x;

    // Slopes
    this.dx = B.x - A.x;
    this.dy = B.y - A.y;

    /**
     * The slope of the ray, dy over dx
     * @type {number}
     */
    this.slope = this.dy / this.dx;

    /**
     * The normalized angle of the ray in radians on the range (-PI, PI)
     * @type {number}
     */
    this.angle = Math.atan2(this.dy, this.dx);

    /**
     * The distance of the ray
     * @type {number}
     */
    this.distance = Math.hypot(this.dx, this.dy);
  }

  /* -------------------------------------------- */

  /**
   * Return the value of the angle normalized to the range (0, 2*PI)
   * This is useful for testing whether an angle falls between two others
   * @type {number}
   */
  get normAngle() {
    let a = this.angle % (2 * Math.PI);
    return a < 0 ? a + 2 * Math.PI : a;
  }

  /* -------------------------------------------- */

  /**
   * A factory method to construct a Ray from an origin point, an angle, and a distance
   * @param {number} x          The origin x-coordinate
   * @param {number} y          The origin y-coordinate
   * @param {number} radians    The ray angle in radians
   * @param {number} distance   The distance of the ray in pixels
   * @return {Ray}              The constructed Ray instance
   */
  static fromAngle(x, y, radians, distance) {
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    const ray = Ray.fromArrays([x, y], [x + dx * distance, y + dy * distance]);
    ray.angle = radians;
    return ray;
  }

  /* -------------------------------------------- */

  /**
   * A factory method to construct a Ray from points in array format.
   * @param {number[]} A    The origin point [x,y]
   * @param {number[]} B    The destination point [x,y]
   * @return {Ray}          The constructed Ray instance
   */
  static fromArrays(A, B) {
    return new this({ x: A[0], y: A[1] }, { x: B[0], y: B[1] });
  }

  /* -------------------------------------------- */

  /**
   * Project the Array by some proportion of it's initial distance.
   * Return the coordinates of that point along the path.
   * @param {number} t    The distance along the Ray
   * @return {Object}     The coordinates of the projected point
   */
  project(t) {
    return {
      x: this.A.x + t * this.dx,
      y: this.A.y + t * this.dy,
    };
  }

  /* -------------------------------------------- */

  /**
   * Create a new ray which uses the same origin point, but a slightly offset angle and distance
   * @param {number} offset       An offset in radians which modifies the angle of the original Ray
   * @param {number} [distance]   A distance the new ray should project, otherwise uses the same distance.
   * @return {Ray}                A new Ray with an offset angle
   */
  shiftAngle(offset, distance) {
    return Ray.fromAngle(
      this.x0,
      this.y0,
      this.angle + offset,
      distance || this.distance
    );
  }

  /* -------------------------------------------- */

  /**
   * Find the point I[x,y] and distance t* on ray R(t) which intersects another ray
   * http://paulbourke.net/geometry/pointlineplane/
   *
   * @param {number[]} coords     An array of coordinates [x0, y0, x1, y1] which defines a line segment to test
   *
   * @return {{x: number, y: number, t0: number, t1: number}|false}
   *    The point of collision [x,y] the position of that collision point along the Ray (t0) an the tested
   *    segment (t1). Returns false if no collision occurs.
   */
  intersectSegment(ray) {
    return this.constructor._getIntersection(
      this.A.x,
      this.A.y,
      this.B.x,
      this.B.y,
      ray.A.x,
      ray.A.y,
      ray.B.x,
      ray.B.y
    );
  }

  /* -------------------------------------------- */

  /**
   * An internal helper method for computing the intersection between two lines.
   * @private
   */
  static _getIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    let e = 1e-12;

    // Length 0 === false
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
      return false;
    }

    // Check denominator - avoid parallel lines where d = 0
    let d = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (d === 0) {
      return false;
    }

    // Get vector distances
    let t0 = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / d;
    let t1 = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / d;

    // Confirm the solution lies within both segments
    const collides =
      Number.between(t0, 0 - e, 1 + e) && Number.between(t1, 0 - e, 1 + e);
    if (!collides) return false;

    // Return an objects with the point of intersection and the distance from the origin
    return {
      x: x1 + t0 * (x2 - x1),
      y: y1 + t0 * (y2 - y1),
      t0: t0,
      t1: t1,
    };
  }
}

export function checkCollision(origin, destination, walls) {
  // Create a Ray for the attempted move
  // let origin = this.getCenter(...Object.values(this._validPosition));
  let ray = new Ray(duplicate(origin), duplicate(destination));

  for (let wall of duplicate(walls)) {
    if (wall.ds === 1){
      continue
    }
    let wallRay = new Ray(
      { x: wall.c[0], y: wall.c[1] },
      { x: wall.c[2], y: wall.c[3] }
    );
    if (ray.intersectSegment(wallRay)) {
      console.log()
      return true;
    }
  }
  return false;
  // Shift the origin point by the prior velocity
  // ray.A.x -= this._velocity.sx;
  // ray.A.y -= this._velocity.sy;

  // Shift the destination point by the requested velocity
  // ray.B.x -= Math.sign(ray.dx);
  // ray.B.y -= Math.sign(ray.dy);

  // Check for a wall collision
  // return canvas.walls.checkCollision(ray);
}
Number.between = function (num, a, b, inclusive = true) {
  let min = Math.min(a, b);
  let max = Math.max(a, b);
  return inclusive ? num >= min && num <= max : num > min && num < max;
};
