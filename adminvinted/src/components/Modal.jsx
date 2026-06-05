import React from 'react';
import { Modal as BModal, Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import '../styles/Modal.css';

const Modal = ({ show, onHide, title, children, footer, size = 'md' }) => {
    return (
        <BModal
            show={show}
            onHide={onHide}
            centered
            size={size}
            className="custom-admin-modal"
            backdrop="static"
            keyboard={false}
        >
            <BModal.Header className="w-100 d-flex justify-content-between align-items-center border-bottom pb-3">
                <BModal.Title className="m-0">{title}</BModal.Title>
                <button className="modal-close-btn m-0" onClick={onHide}>
                    <FaTimes />
                </button>
            </BModal.Header>
            <BModal.Body>
                {children}
            </BModal.Body>
            {footer && (
                <BModal.Footer>
                    {footer}
                </BModal.Footer>
            )}
        </BModal>
    );
};

export default Modal;
