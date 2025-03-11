import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 w-100">
      <div className="spinner-border text-burgundy" style={{ width: '2rem', height: '2rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
