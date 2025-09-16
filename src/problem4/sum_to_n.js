/* Provide 3 unique implementations of the following function in JavaScript.

Input**: `n` - any integer

Assuming this input will always produce a result lesser than `Number.MAX_SAFE_INTEGER`*.

Output**: `return` - summation to `n`, i.e. `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`.
*/

/* Using loop
Time complexity: O(n)
Space complexity: O(1)
*/
var sum_to_n_a = function (n) {
  if (n < 0) return 0;
  let sum = 0;
  for (let i = 1; i <= n; ++i) {
    sum += i;
  }
  return sum;
};

/* Using mathematic formula for n consecutive integer numbers 
Time complexity: O(1)
Space complexity: O(1)
*/
var sum_to_n_b = function (n) {
  if (n < 0) return 0;
  return (n * (n + 1)) / 2;
};

/* Using recursion
Time complexity: O(n)
Space complexity: O(n)
*/
var sum_to_n_c = function (n) {
  if (n <= 0) return 0;
  return n + sum_to_n_c(n - 1);
};

/* Using Array.reduce method ( only for JavaScript )
Time complexity: O(n)
Space complexity: O(n)
*/
var sum_to_n_d = function (n) {
  if (n < 0) return 0;
  return Array.from({ length: n }, (_, i) => i + 1).reduce(
    (sum, num) => sum + num,
    0
  );
};

// Add exports for testing
module.exports = {
  sum_to_n_a,
  sum_to_n_b,
  sum_to_n_c,
  sum_to_n_d,
};
