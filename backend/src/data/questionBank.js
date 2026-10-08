// Offline fallback questions: [topic, difficulty(1-3), question, options, correctIndex, explanation]
const rows = [
  ['Python Basics', 1, 'Which function prints text to the screen in Python?', ['echo()', 'print()', 'console.log()', 'write()'], 1, 'print() sends output to the console.'],
  ['Python Basics', 2, 'What does indentation do in Python?', ['Nothing, it is only style', 'Marks blocks of code', 'Comments out code', 'Declares variables'], 1, 'Python uses indentation to define blocks such as function bodies and loops.'],
  ['Python Basics', 3, 'What is the output of print(type(3 / 2))?', ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'double'>"], 1, 'The / operator always returns a float in Python 3.'],
  ['Data Types', 1, 'Which of these is a string?', ['42', '3.14', '"hello"', 'True'], 2, 'Text inside quotes is a str.'],
  ['Data Types', 2, 'What is the result of int("7") + 3?', ['10', '73', 'Error', '"73"'], 0, 'int("7") converts the string to the integer 7, so 7 + 3 is 10.'],
  ['Data Types', 3, 'Which type is immutable?', ['list', 'dict', 'tuple', 'set'], 2, 'Tuples cannot be changed after creation; lists, dicts and sets can.'],
  ['Loops', 1, 'What is a while loop?', ['A loop that runs a fixed number of times', 'A loop that runs while a condition is true', 'A loop used only in functions', 'A loop that runs once'], 1, 'A while loop repeats its block as long as its condition stays true.'],
  ['Loops', 2, 'What does range(3) produce?', ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', '3'], 1, 'range(3) starts at 0 and stops before 3.'],
  ['Loops', 3, 'What does the "break" statement do inside a loop?', ['Skips to the next iteration', 'Exits the loop immediately', 'Restarts the loop', 'Pauses the loop'], 1, 'break ends the loop at once; continue skips to the next iteration.'],
  ['Functions', 1, 'Which keyword defines a function in Python?', ['func', 'function', 'def', 'lambda only'], 2, 'Functions are defined with def.'],
  ['Functions', 2, 'What does a function return if it has no return statement?', ['0', 'None', 'An empty string', 'An error'], 1, 'Functions without an explicit return give back None.'],
  ['Functions', 3, 'What is the output of: def f(x, y=2): return x * y; print(f(3))?', ['3', '5', '6', 'Error'], 2, 'y defaults to 2, so f(3) returns 3 * 2 = 6.'],
  ['Data Structures', 1, 'Which brackets create a list?', ['()', '[]', '{}', '<>'], 1, 'Lists use square brackets.'],
  ['Data Structures', 2, 'How do you read the value for key "a" in dict d?', ['d.a', 'd(a)', 'd["a"]', 'd->a'], 2, 'Dictionary values are read with d["a"] or d.get("a").'],
  ['Data Structures', 3, 'What is the time complexity of looking up a key in a dict (average)?', ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], 2, 'Dictionaries use hashing, so average lookup is constant time.'],
];

export const questionBank = rows.map(([topic, difficulty, question, options, correctIndex, explanation]) => ({
  topic, difficulty, question, options, correctIndex, explanation,
}));
