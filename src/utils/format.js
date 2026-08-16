export const formatValidationErrors = (errors) => {
    if (!errors || !errors.issue) return 'Validation error';
    if (Array.isArray(errors.issue)) return errors.issue.map(i => i.message).join(',');

    return JSON.stringify(errors);
}