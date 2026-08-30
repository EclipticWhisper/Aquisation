
export const cookies = {
  getOptions: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set to true in production
    sameSite: 'strict',
    maxAge: 15 * 60 * 60 * 1000, // 15 hours in milliseconds
  }),

  set: (res, name, value, options) => {
    res.cookie(name, value, { ...cookies.getOptions(), ...options });
  },

  clear: (res, name, options) => {
    res.clearCookie(name, { ...cookies.getOptions(), ...options });
  },


  get: (req, name) => {
    return req.cookies[name];
  }

};