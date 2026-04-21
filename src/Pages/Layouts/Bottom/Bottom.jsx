import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Row, Col, Card, Stack, Toast } from 'react-bootstrap';
import { FaHome } from 'react-icons/fa';
import { RxIdCard } from "react-icons/rx";
import { IoLogOutSharp } from "react-icons/io5";
import axiosInstance from '../../../axiosConfig';
import ConfirmModal from '../../../Components/ConfirmModal';
import { Link } from 'react-router-dom';
import { GiMagnifyingGlass } from "react-icons/gi";
import { FaGear } from "react-icons/fa6";
import { ImSearch } from "react-icons/im";


import './Bottom.css';

const Bottom = () => {
  const [showToast, setShowToast] = useState(false);
  const toastRef = useRef(null);
  const [toastType, setToastType] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State untuk ConfirmModal

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  const handleShowAndCloseToast = () => {
    if (showToast) {
      handleCloseToast();
    } else {
      setShowToast(true);
    }
  };

  // Memoize handleClickOutside
  const handleClickOutside = useCallback(
    (event) => {
      if (toastRef.current && !toastRef.current.contains(event.target)) {
        handleCloseToast();
      }
    },
    [toastRef, handleCloseToast]
  );

  useEffect(() => {
    if (showToast) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToast, handleClickOutside]);

  const handleLogoutConfirm = (confirmed) => {
    setShowConfirmModal(false);
    if (confirmed) {
      axiosInstance.post('auth/logout')
        .then(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        })
        .catch(error => {
          console.error(error);
        });
    }
  };

  return (
    <>  
        <Card className="main-menu bg-burgundy-gradient position-fixed bottom-0 start-50 translate-middle-x my-4" style={{ zIndex: 999 }}>
          <Row className="justify-content-md-center p-3">
            <Col md="auto">
              <Stack direction="horizontal" gap={3} className="justify-content-center">
                <a href="/" className="text-decoration-none mx-2">
                  <Stack direction="vertical" className="justify-content-center align-items-center">
                    <FaHome size={25} />
                    <span className="text-center" style={{ fontSize: '9px' }}>Home</span>
                  </Stack>
                </a>
                <a href="/laporan-stock-greige" className="text-decoration-none mx-2">
                  <Stack direction="vertical" className="justify-content-center align-items-center">
                    <RxIdCard size={25} />
                    <span className="text-center" style={{ fontSize: '9px' }}>Rekap Laporan Stock</span>
                  </Stack>
                </a>
                <a href="/laporan-stock-opname" className="text-decoration-none mx-2">
                  <Stack direction="vertical" className="justify-content-center align-items-center">
                    <RxIdCard size={25} />
                    <span className="text-center" style={{ fontSize: '9px' }}>Rekap Laporan Stock Opname</span>
                  </Stack>
                </a>
                <Link  className="text-decoration-none mx-2" onClick={() => { setToastType('setting-menu'); handleShowAndCloseToast();}}>
                  <Stack direction="vertical" className="justify-content-center align-items-center text-center">
                    <FaGear size={25} />
                    <span className="" style={{ fontSize: '9px' }}>Setting</span>
                  </Stack>
                </Link>
              </Stack>
            </Col>
          </Row>
        </Card>
      {showToast && (
        <div ref={toastRef}>
          <Toast
            onClose={handleCloseToast}
            show={showToast}
            className="text-center toast-top"
            style={{ zIndex: 9999 }}
          >
            <Toast.Body>
              <Stack direction="vertical" className="justify-content-center align-items-center">
                {/* {toastType === 'inspect-menu' && (
                  <>
                    <a href="/inspecting-create-dyeing" className="text-decoration-none p-2 w-100" onClick={(e) => { e.preventDefault(); window.location.href = '/inspecting-create-dyeing'; }}>
                      <Stack direction="horizontal" gap={3} className="justify-content-center align-items-center">
                        <RxIdCard size={25} />
                        <span className="" style={{ fontSize: '12px' }}>Create Inspect Dyeing</span>
                      </Stack>
                    </a>
                    <a href="/inspecting-create-printing" className="text-decoration-none p-2 w-100" onClick={(e) => { e.preventDefault(); window.location.href = '/inspecting-create-printing'; }}>
                      <Stack direction="horizontal" gap={3} className="justify-content-center align-items-center">
                        <RxIdCard size={25} />
                        <span className="" style={{ fontSize: '12px' }}>Create Inspect Printing</span>
                      </Stack>
                    </a>
                    <a href="/inspecting-create-mkl-bj" className="text-decoration-none p-2 w-100" onClick={(e) => { e.preventDefault(); window.location.href = '/inspecting-create-mkl-bj'; }}>
                      <Stack direction="horizontal" gap={3} className="justify-content-center align-items-center">
                        <RxIdCard size={25} />
                        <span className="" style={{ fontSize: '12px' }}>Create Inspect MKL/BJ</span>
                      </Stack>
                    </a>
                  </>
                )} */}
                {toastType === 'setting-menu' && (
                    <a href="#" className="text-decoration-none p-2 w-100" onClick={(e) => { e.preventDefault(); setShowConfirmModal(true); }}>
                    <Stack direction="horizontal" gap={3} className="justify-content-center align-items-center">
                      <IoLogOutSharp size={25} />
                      <span className="" style={{ fontSize: '12px' }}>Logout</span>
                    </Stack>
                  </a>
                )}
              </Stack>
            </Toast.Body>
          </Toast>
        </div>
      )}
      <ConfirmModal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Konfirmasi Logout"
      />
    </>
  );
};

export default Bottom;

