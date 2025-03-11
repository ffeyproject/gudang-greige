
import { IoWarningOutline } from "react-icons/io5";
import { Button } from "react-bootstrap";


const ErrorPage = (props) => {

    
  let errorMessage = 'An unexpected error occurred.';

  if (props.status) {
    if (props.status === 400) {
      errorMessage = 'Permintaan Anda terlalu lama. Silakan coba lagi nanti.';
    } else if (props.status === 402) {
      errorMessage = 'Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.';
    } else if (props.status === 500) {
      errorMessage = 'Terjadi kesalahan ketika koneksi server, hal ini dapat terjadi karena kesalahan server, atau akun anda sedang digunakan di perangkat lain.';
    } else if (props.status === 404) {
      errorMessage = 'Halaman yang Anda cari tidak ditemukan.';
    } else if (props.status === 408) {
      errorMessage = 'Request timeout. Silakan coba lagi nanti.';
    }
    
  }



  return (
    <div className='d-flex flex-column justify-content-center align-items-center vh-100 bg-burgundy-gradient bg-pattern-container text-white'>
      <IoWarningOutline style={{ fontSize: '100px' }} />
      <h1>Maaf, Terjadi kesalahan</h1>
      <p>{errorMessage}</p>
      {
        props.status === 500 &&
        <Button variant={'warning'} className="text-burgundy" onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}>Re-Connecting</Button>
      }

    </div>
  );
};

export default ErrorPage;
