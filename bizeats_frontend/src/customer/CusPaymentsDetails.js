import React, { useState } from "react";
import { CreditCard, Trash2, PlusCircle, X } from "lucide-react";
import "../assets/css/customer/CusPaymentsDetails.css";

const CusPaymentsDetails = () => {
  const [cards, setCards] = useState([
    { id: 1, type: "Visa", last4: "1234", expiry: "12/26" },
    { id: 2, type: "MasterCard", last4: "5678", expiry: "08/24" },
  ]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const handleDelete = (card) => {
    setShowConfirm(true);
    setCardToDelete(card);
  };

  const confirmDelete = () => {
    setCards(cards.filter((c) => c.id !== cardToDelete.id));
    setShowConfirm(false);
    setCardToDelete(null);
  };

  return (
    <div className="payment-container">
      <h3 className="payment-title">Saved Payment Methods</h3>

      {cards.length === 0 ? (
        <p className="no-cards">No saved payment methods.</p>
      ) : (
        <ul className="card-list">
          {cards.map((card) => (
            <li key={card.id} className="card-item">
              <CreditCard size={24} className="card-icon" />
              <div className="card-details">
                <p className="card-type">{card.type} Ending in {card.last4}</p>
                <p className="card-expiry">Exp: {card.expiry}</p>
              </div>
              <button className="delete-btn" onClick={() => handleDelete(card)}>
                <Trash2 size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h4>Confirm Deletion</h4>
            <p>Are you sure you want to delete {cardToDelete?.type} ending in {cardToDelete?.last4}?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
            <button className="close-btn" onClick={() => setShowConfirm(false)}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CusPaymentsDetails;
