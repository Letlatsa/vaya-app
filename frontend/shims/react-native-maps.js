const React = require('react');

function MapView(props) {
  const { style, children, ...rest } = props || {};
  return React.createElement('div', Object.assign({ style: Object.assign({ position: 'relative' }, style) }, rest), children);
}

function Marker(props) {
  const { children, style, ...rest } = props || {};
  return React.createElement('div', Object.assign({ style: Object.assign({ display: 'inline-block' }, style) }, rest), children);
}

module.exports = {
  MapView,
  Marker,
  PROVIDER_GOOGLE: 'google',
  default: {
    MapView,
    Marker,
    PROVIDER_GOOGLE: 'google',
  },
};
