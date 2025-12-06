export const shouldShowQuestion = (rules, answersSoFar) => {
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return true;
  }

  const results = rules.conditions.map((condition) => {
    const { questionKey, operator, value } = condition;
    const userAnswer = answersSoFar[questionKey];

    const answerStr = userAnswer ? String(userAnswer).toLowerCase().trim() : "";
    const ruleValueStr = value ? String(value).toLowerCase().trim() : "";

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

  if (rules.logic === "OR") {
    return results.some((r) => r === true);
  }
  return results.every((r) => r === true);
};
