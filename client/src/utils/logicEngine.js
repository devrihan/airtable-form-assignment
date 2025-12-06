export const shouldShowQuestion = (rules, answersSoFar) => {
  // 1. If no rules exist, show the field by default
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return true;
  }

  // 2. Evaluate all conditions
  const results = rules.conditions.map((condition) => {
    const { questionKey, operator, value } = condition;
    const userAnswer = answersSoFar[questionKey];

    // --- ROBUST COMPARISON LOGIC ---

    // Convert everything to lowercase strings for safe comparison
    const answerStr = userAnswer ? String(userAnswer).toLowerCase().trim() : "";
    const ruleValueStr = value ? String(value).toLowerCase().trim() : "";

    // Debugging (Optional: Check your console if it still fails)
    // console.log(`Checking: "${answerStr}" ${operator} "${ruleValueStr}"`);

    switch (operator) {
      case "equals":
        return answerStr === ruleValueStr;
      case "notEquals":
        return answerStr !== ruleValueStr;
      case "contains":
        return answerStr.includes(ruleValueStr);
      default:
        return false;
    }
  });

  // 3. Combine results (AND / OR)
  if (rules.logic === "OR") {
    return results.some((r) => r === true);
  }
  // Default is AND
  return results.every((r) => r === true);
};
