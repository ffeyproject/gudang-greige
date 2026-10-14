import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Stack,Badge, Button ,Spinner } from 'react-bootstrap';
import axiosInstance from '../axiosConfig';
import Bottom from './Layouts/Bottom/Bottom';
import LoadingSpinner from '../Components/LoadingSpinner';
import { GiMagnifyingGlass } from "react-icons/gi";
import { Link } from 'react-router-dom';
import { RxIdCard } from "react-icons/rx";
import { FaBoxesStacked } from "react-icons/fa6";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import ErrorPage from '../ErrorPage';

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  document.title = 'Gudang Greige | Dashboard';
  const [data, setData] = useState({});
  const [inspectRecent, setInspectRecent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState({});
  const [chartlabels, setChartLabels] = useState([]);
  const [isError, setIsError] = useState(false);
  const [isSearchForGrafik, setIsSearchForGrafik] = useState(false);

  const fetchDataIndex = async () => {
    try {
      const response = await axiosInstance.get('dashboard/index');
      setData(response.data);
      console.log(response.data);
      setInspectRecent(response.data.recent_kartu_proses_dyeing);
      // setChartData(Object.values(response.data.inspectings_per_year));
      // setChartLabels(Object.keys(response.data.inspectings_per_year));
    } catch (error) {
      setIsError(error.response?.status || 'Error');
      console.log(error.response);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataGrafik = async () => {
    try {
      setIsSearchForGrafik(true);
      const response = await axiosInstance.get('dashboard/grafik');
      setData(response.data);
      console.log(response.data);
      setChartData(Object.values(response.data.inspectings_per_year));
      setChartLabels(Object.keys(response.data.inspectings_per_year));
    } catch (error) {
      setIsError(error.response?.status || 'Error');
      console.log(error.response);
    } finally {
      setIsSearchForGrafik(false);
    }
  };

  useEffect(() => {
    fetchDataIndex();
  }, []);

  useEffect(() => {
    console.log(inspectRecent);
  }, [inspectRecent]);

  const dataChart = {
    labels: chartlabels.map((key) => new Date(Date.parse(key)).toLocaleString('default', { month: 'short' })),
    datasets: [
      {
        label: 'Data Inspect',
        data: chartData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 215, 0, 0.5)',
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorPage status={isError}/>
      ) : (
        <>
          <div style={{ position: "relative", minHeight: "40rem", paddingBottom: "10rem" }}>
            <div
              style={{
                height: "100%",
                minHeight: "40rem",
                justifyContent: "center",
                paddingBottom: "100px",
              }}
              className="bg-burgundy-gradient bg-pattern-container text-white p-4 curved-container"
            >
            </div>

            {/* Konten Overlay */}

            <div className="text-white p-4" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
              <Container className="py-5">
                <Stack direction="vertical">
                  <div className="">
                    <h1>
                      {new Date().getHours() < 12
                        ? "Selamat Pagi!"
                        : new Date().getHours() < 15
                          ? "Selamat Siang!"
                          : new Date().getHours() < 18
                            ? "Selamat Sore!"
                            : "Selamat Malam!"
                      }
                    </h1>
                    <p>
                      Anda Login Sebagai : {" "}
                      <Badge bg="danger" className="text-white p-2">
                        {data.users?.username
                          ? data.users.username.charAt(0).toUpperCase() +
                            data.users.username.slice(1)
                          : ""}
                      </Badge>
                    </p>
                  </div>

                  {/* Menu Shortcuts */}
                  <Row className="mt-3 g-3">
                    <Col xs={12} sm={6} md={3}>
                      <Card
                        as={Link}
                        to="/stock-greige-daily"
                        className="text-decoration-none shadow border-0 p-3 bg-white text-dark h-100 rounded-3 transition-card"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="bg-burgundy text-white p-2 rounded-2">
                            <FaBoxesStacked size={20} />
                          </div>
                          <Badge bg="danger" className="text-uppercase" style={{ fontSize: '9px' }}>
                            Baru
                          </Badge>
                        </div>
                        <h6 className="fw-bold mb-1 text-dark">Stok Greige Harian & Matriks</h6>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          Tracking stok harian, komparasi selisih & matriks pergerakan antar hari.
                        </small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Card
                        as={Link}
                        to="/laporan-stock-greige"
                        className="text-decoration-none shadow border-0 p-3 bg-white text-dark h-100 rounded-3 transition-card"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="bg-burgundy text-white p-2 rounded-2">
                            <RxIdCard size={20} />
                          </div>
                        </div>
                        <h6 className="fw-bold mb-1 text-dark">Rekap Laporan Stock</h6>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          Rekapitulasi stok greige berdasarkan tanggal dan filter kondisi.
                        </small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Card
                        as={Link}
                        to="/laporan-stock-greige-motif"
                        className="text-decoration-none shadow border-0 p-3 bg-white text-dark h-100 rounded-3 transition-card"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="bg-burgundy text-white p-2 rounded-2">
                            <RxIdCard size={20} />
                          </div>
                        </div>
                        <h6 className="fw-bold mb-1 text-dark">Stok Per Motif</h6>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          Rekapan akumulasi total stok greige per motif kain.
                        </small>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Card
                        as={Link}
                        to="/laporan-stock-opname"
                        className="text-decoration-none shadow border-0 p-3 bg-white text-dark h-100 rounded-3 transition-card"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="bg-burgundy text-white p-2 rounded-2">
                            <RxIdCard size={20} />
                          </div>
                        </div>
                        <h6 className="fw-bold mb-1 text-dark">Stock Opname</h6>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          Laporan data hasil stock opname fisik greige gudang.
                        </small>
                      </Card>
                    </Col>
                  </Row>
                </Stack>
              </Container>
            </div>
          </div>
          <Bottom />
        </>
      )}
    </>
  );
};

export default Dashboard;



