// Returns the |i|-th number in a string; or null if there are less that |i|
// numbers. Returns null if there are less than |i| numbers in |string|. It
// ignores sign when parsing the number.
function number_selector(i, string) {
  let re = new RegExp(/\d+(\.\d+)?/g);
  let numbers = string.match(re);
  return 1 * numbers[i];
}

// Generator of |i|'th number extractor methods.
function extract_number(i) {
  return (string) => number_selector(i, string);
}

// Helper method for the tests.

// Minimal description of an animation of CSS property |property| changing style
// from |from_style| to |to_style|. |value_selector| is a function which returns
// a numeric value for any given computed style of the |property| on some
// element.
function Scenario(property, from_style, to_style, value_selector) {
  return {
    property: property,
    from: from_style,
    to: to_style,
    value_of: (value_selector ? value_selector : extract_number(0))
  };
}

// Helper class to run and sample (the computed style of) |element| for the
// given property in |scenario| and duration |duration|.
function AnimationScenario(element, scenario, duration) {
  if (scenario.default_style)
    element.style = scenario.default_style;
  this.element = element;
  this.scenario = scenario;
  this.duration = duration;
  this.style_samples = [];
}

// Samples the computed style for the |this.element|. Only stores the style
// corresponding to |this.property()|.
AnimationScenario.prototype.sample = (self) => {
  var cs = window.getComputedStyle(self.element, null);
  let property = self.scenario.property;
  // Compute the style and return the corresponding numeric value.
  self.style_samples.push(
      self.scenario.value_of(cs.getPropertyValue(property)));
};

AnimationScenario.prototype.start = (self) => {
  let property = self.scenario.property;
  let frames =  [{}, {}];
  frames[0][property] = self.scenario.from;
  frames[1][property] = self.scenario.to;
  let animation = self.element.animate(
      frames, {duration: self.duration, easing: "linear"});
  self.animation = () => { return animation; };
};

// Creates a <div> (to animate) inside a container <div (which has fixed
// dimensions).
function create_isolated_element() {
  var div_container = document.createElement("div");
  div_container.setAttribute("class", "container");
  document.body.appendChild(div_container);
  var animated_element = document.createElement("div");
  animated_element.setAttribute("class", "animated");
  div_container.appendChild(animated_element);
  return animated_element;
}

// Returns an array of values representing a line connecting |start_value| to
// |end_value| where the value at each index 'i' is the value of the line at time
// |t_arr[i]|.
function linear_timing_function(t_arr, start_value, end_value) {
  let values = [];
  let start = t_arr[0];
  let duration = t_arr[t_arr.length - 1] - start;
  t_arr.forEach( (t) => {
   values.push(
      (t - start) /  duration * (end_value - start_value) + start_value);
  });
  return values;
}

// Returns an array of values representing a step function with an initial value
// of |initial_value| transitioning at time |transition_instance| to a final
// value of |final_value|. The value at index 'i' is the step function's value
// at time |t_arr[i]|.
function step_timing_function(t_arr, initial_value, final_value, transition_instance) {
  let values = [];
  t_arr.forEach( (t) => {
   values.push(t <= transition_instance ? initial_value : final_value);
  });
  return values;
}

// Takes in two arbitrary arrays and finds the first index where the arrays
// differ in value. |equals| is the predicate that defines equality between
// array elements.
function find_index_of_first_difference(arr_1, arr_2, equals) {
  let len = Math.max(arr_1.length, arr_2.length);
  for (var index = 0; index < len; ++index) {
    if (index in arr_1 && index in arr_2 && equals(arr_1[index], arr_2[index]))
      continue;
    return index;
  }
  return -1;
}

// Returns true if |x - y| <= 1.0.
function almost_equal_ignoring_rounding_errors(x, y) {
  return Math.abs(x - y) <= 1.0;
}

// Runs animations for all scenarios in |scenarios| and takes style samples at
// every |sample_interval|. Each animation scenario runs on a unique element of
// its own. The end result will contain scenarios, style samples, and time
// stamps fir those samples. The samples returned miss the last sample to avoid
// potential discontinuity when taking a sample at animation's end time (style
// would reset).
function run_animation_test(scenarios, sample_interval, animation_duration) {
  let animations = [];
  scenarios.forEach((s) => {
    animations.push(new AnimationScenario(create_isolated_element(),
                                          s,
                                          animation_duration));
  });

  // Take one style sample for all animations. Advances the animation time to
  // |t| prior to sampling.
  function advance_time_and_sample(t) {
    animations.forEach( (animation) => {
      animation.animation().currentTime = t;
      animation.sample(animation);
    });
  }

  // Initiate all the animations.
  animations.forEach( (animation) => {
    animation.start(animation);
  });

  let sample_times = [];
  return new Promise( (resolve) => {
    window.requestAnimationFrame(() => {
      let sample_count = 1 + Math.floor(animation_duration / sample_interval);
      let current_time = 0;
      for (var sample_index = 0; sample_index < sample_count; ++sample_index) {
        sample_times.push(current_time);
        advance_time_and_sample(current_time);
        current_time += sample_interval;
      }
      let results = [];
      // Dropping the last sample.
      let n_samples = sample_count - 1;
      animations.forEach((animation) => {
        results.push( {
          property: animation.scenario.property,
          from_style: animation.scenario.from,
          to_style: animation.scenario.to,
          samples: animation.style_samples.splice(0, n_samples)
        });
      });
      resolve({
        scenarios: results,
        time_stamps: sample_times.splice(0, n_samples)
      });
    });
  });
}

// A small set of some styles which are not affected by the 'layout-animations'
// policy. All the animations will lead to some linearly changing style points.
var sample_scenarios_not_blocked_by_policy = [
    new Scenario("background", "black", "red", null, extract_number(0) /* R in rgba(R,G,B,A) */),
    new Scenario("transform", "translateX(0px)", "translateX(100px)", null, extract_number(4) /* X in matrix(a,b,c,d,X,Y) */),
    new Scenario("opacity", "0", "1.0", null, extract_number(0))];


// One scenario for each of the styles which can be blocked from being
// declaratively animated when 'layout-animations' is disabled.
var sample_scenarios_blocked_by_policy = [
    new Scenario("bottom", "0px", "100px"), new Scenario("height", "0px", "100px"),
    new Scenario("left", "0px", "100px"), new Scenario("right", "0px", "100px"),
    new Scenario("top", "0px", "100px"), new Scenario("width", "0px", "100px")];
