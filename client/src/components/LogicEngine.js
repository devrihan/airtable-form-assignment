export const shouldShowQuestion = (rules, answersSoFar) => {
  if (!rules || !rules.conditions || rules.conditions.length === 0) return true;

  const results = rules.conditions.map((condition) => {
    const answer = answersSoFar[condition.questionKey];
    if (answer === undefined || answer === null || answer === "") return false;

    switch (condition.operator) {
      case "equals":
        return answer == condition.value;
      case "notEquals":
        return answer != condition.value;
      case "contains":
        return Array.isArray(answer)
          ? answer.includes(condition.value)
          : String(answer).includes(condition.value);
      default:
        return false;
    }
  });

  if (rules.logic === "OR") return results.some((r) => r === true);
  return results.every((r) => r === true);
};
