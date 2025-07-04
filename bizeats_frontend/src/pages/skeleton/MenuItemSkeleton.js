// src/components/skeletons/MenuItemSkeleton.js
import React from 'react';

const MenuItemSkeleton = () => {
  return (
    <li className="order-details-page-menu-food-item skeleton-item">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-line" style={{ width: '70%', height: '20px' }}></div>
        <div className="skeleton-line" style={{ width: '90%', height: '16px', marginTop: '10px' }}></div>
        <div className="skeleton-line" style={{ width: '40%', height: '16px', marginTop: '10px' }}></div>
        <div className="skeleton-line" style={{ width: '30%', height: '16px', marginTop: '10px' }}></div>
        <div className="skeleton-line" style={{ width: '100px', height: '36px', marginTop: '15px' }}></div>
      </div>
    </li>
  );
};

export default MenuItemSkeleton;