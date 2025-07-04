// src/components/skeletons/RestaurantHeaderSkeleton.js
import React from 'react';

const RestaurantHeaderSkeleton = () => {
  return (
    <div className="skeleton-header">
      <div className="skeleton-line" style={{ width: '60%', height: '32px', marginBottom: '20px' }}></div>
      <div className="skeleton-line" style={{ width: '80%', height: '24px' }}></div>
      <div className="skeleton-line" style={{ width: '60%', height: '18px', marginTop: '10px' }}></div>
    </div>
  );
};

export default RestaurantHeaderSkeleton;