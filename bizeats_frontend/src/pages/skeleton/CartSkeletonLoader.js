import React from "react";
import "../../assets/css/CartSkeletonLoader.css";

const CartSkeletonLoader = () => {
  return (
    <div className="cartSkeleton-container">
      <div className="cartSkeleton-header">
        <div className="cartSkeleton-title"></div>
        <div className="cartSkeleton-stepIndicator">
          <div className="cartSkeleton-step"></div>
          <div className="cartSkeleton-connector"></div>
          <div className="cartSkeleton-step"></div>
          <div className="cartSkeleton-connector"></div>
          <div className="cartSkeleton-step"></div>
        </div>
      </div>
      
      <div className="cartSkeleton-items">
        {[1, 2, 3].map((item) => (
          <div key={item} className="cartSkeleton-item">
            <div className="cartSkeleton-image"></div>
            <div className="cartSkeleton-details">
              <div className="cartSkeleton-line cartSkeleton-titleLine"></div>
              <div className="cartSkeleton-line cartSkeleton-priceLine"></div>
              <div className="cartSkeleton-actions">
                <div className="cartSkeleton-button"></div>
                <div className="cartSkeleton-quantity"></div>
                <div className="cartSkeleton-button"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="cartSkeleton-summary">
        <div className="cartSkeleton-priceRow"></div>
        <div className="cartSkeleton-priceRow"></div>
        <div className="cartSkeleton-proceedBtn"></div>
      </div>
    </div>
  );
};

export default CartSkeletonLoader;