const {
  sum_to_n_a,
  sum_to_n_b,
  sum_to_n_c,
  sum_to_n_d,
} = require("./sum_to_n");

describe("Sum to N Functions", () => {
  const testCases = [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 2, expected: 3 },
    { input: 5, expected: 15 },
    { input: 10, expected: 55 },
    { input: 50, expected: 1275 },
    { input: 100, expected: 5050 },
  ];

  // Test sum_to_n_a (loop implementation)
  describe("sum_to_n_a", () => {
    testCases.forEach(({ input, expected }) => {
      test(`should return ${expected} for n = ${input}`, () => {
        expect(sum_to_n_a(input)).toBe(expected);
      });
    });

    test("should handle negative numbers by returning 0", () => {
      expect(sum_to_n_a(-5)).toBe(0);
    });
  });

  // Test sum_to_n_b (mathematical formula)
  describe("sum_to_n_b", () => {
    testCases.forEach(({ input, expected }) => {
      test(`should return ${expected} for n = ${input}`, () => {
        expect(sum_to_n_b(input)).toBe(expected);
      });
    });

    test("should handle negative numbers by returning 0", () => {
      expect(sum_to_n_b(-5)).toBe(0);
    });
  });

  // Test sum_to_n_c (recursion)
  describe("sum_to_n_c", () => {
    testCases.forEach(({ input, expected }) => {
      test(`should return ${expected} for n = ${input}`, () => {
        expect(sum_to_n_c(input)).toBe(expected);
      });
    });

    test("should handle negative numbers by returning 0", () => {
      expect(sum_to_n_c(-5)).toBe(0);
    });
  });

  // Test sum_to_n_d (Array.reduce)
  describe("sum_to_n_d", () => {
    testCases.forEach(({ input, expected }) => {
      test(`should return ${expected} for n = ${input}`, () => {
        expect(sum_to_n_d(input)).toBe(expected);
      });
    });

    test("should handle negative numbers by returning 0", () => {
      expect(sum_to_n_d(-5)).toBe(0);
    });
  });
});
