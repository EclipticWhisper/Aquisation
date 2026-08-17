export const formatValidationErrors = (error) => {
    if (!error || !Array.isArray(error.issues)) return 'Validation error';
    return error.issues.map((i) => i.message).join(', ');
};