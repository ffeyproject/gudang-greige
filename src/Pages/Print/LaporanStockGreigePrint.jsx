import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Modal } from 'react-bootstrap';
import axiosInstance from '../../axiosConfig';
import LoadingSpinner from '../../Components/LoadingSpinner';
import moment from 'moment';

const LaporanStockGreige = () => {
    document.title = "Laporan Stock Greige | Print";
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState('2021-01-01');
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [params, setParams] = useState({});
    const [isSearchingProcess, setSearchingProcess] = useState(false);
    const [note, setNote] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const printRef = useRef();
    const [isNotPrinting, setIsNotPrinting] = useState(true);

    const kondisiGreige = {
        1: "Salur Muda",
        2: "Salur Tua",
        3: "Salur Abnormal",
        4: "Normal",
        5: "Lain-lain",
        6: "TSD"
    }

    const asalGreige = {
        1: "WJL",
        2: "Beli",
        3: "Rapier",
        4: "Beli Import",
        5: "Lain-lain",
        6: "Retur",
        7: "Mutasi",
        8: "Pemotongan",
        9: "Makloon",
    }

    const renderSettingText = (items) => {
        if (!items || items.length === 0) return null;
        const totalGap = items.reduce((total, d) => total + (Number(d.total_setting_gap) || 0), 0);
        const totalLuar = items.reduce((total, d) => total + (Number(d.total_setting_luar) || 0), 0);
        const totalLain = items.reduce((total, d) => total + (Number(d.total_setting_lain) || 0), 0);

        const parts = [];
        if (totalGap > 0) parts.push(`Setting di Gap : ${totalGap.toLocaleString('id-ID')}`);
        if (totalLuar > 0) parts.push(`Setting di Luar : ${totalLuar.toLocaleString('id-ID')}`);
        if (totalLain > 0) parts.push(`Setting : ${totalLain.toLocaleString('id-ID')}`);

        if (parts.length === 0) return null;
        return `( ${parts.join(' | ')} )`;
    };

    const type = "portrait";
    useEffect(() => {
        const style = document.createElement("style");
        style.innerHTML = `
        @media print {
            @page {
            size: A4 ${type};
            margin: 0.5cm;
            }
        }
        `;
        document.head.appendChild(style);

        return () => {
        document.head.removeChild(style);
        };
    }, [type]);

    const handlePrint = () => {
        setIsNotPrinting(false);
        setTimeout(() => {
            const printContent = printRef.current.innerHTML;
            document.body.innerHTML = printContent;
            window.print();
            setIsNotPrinting(true);
          }, 100);
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paramObj = Object.fromEntries(urlParams.entries());
        // console.log(paramObj);

        setSearchingProcess(true);
        axiosInstance.get('greige/rekap-stock-greige', { params: paramObj })
            .then(response => {
                setData(
                    response.data.data.sort((a, b) => (a.greige_id > b.greige_id) ? 1 : -1)
                );
                // console.log('RESPON',response.data.data);
            })
            .catch(error => {
                console.error(error);
                // console.log('payload', paramObj);
            })
            .finally(() => {
                setSearchingProcess(false);
                handlePrint();
            });
    }, []);

    return (
        <>
        {isSearchingProcess && <LoadingSpinner />}
        <Container fluid className="mt-3" style={{ fontSize: '12px', width: '95%' }}>
            <Row>
                <Col>
                    <Card>
                        <Card.Body>
                            <div ref={printRef} className='p-3 border mt-2'>
                                <>
                                <h4 className='text-center py-4'>REKAP LAPORAN STOCK GREIGE <p className='h6'>PT. GAJAH ANGKASA PERKASA</p></h4>
                                <Table bordered responsive={isNotPrinting} style={{ borderColor: "black", fontSize: "11px"}}>
                                    <tbody className='text-center'>
                                        <tr>
                                            <th rowSpan={2}>Motif</th>
                                            <th colSpan={2}>Lot</th>
                                            <th rowSpan={2}>Keterangan</th>
                                            <th rowSpan={2}>Kondisi Greige</th>
                                            <th rowSpan={2}>Asal Greige</th>
                                            <th rowSpan={2}>lebar Kain</th>
                                            <th rowSpan={2}>Jumlah Stock</th>
                                            <th colSpan={6}>Saldo Akhir</th>

                                        </tr>
                                        <tr>
                                            <th>Lusi</th>
                                            <th>Pakan</th>
                                            <th>A</th>
                                            <th>B</th>
                                            <th>C</th>
                                            <th>D</th>
                                            <th>X</th>
                                            <th>Total</th>
                                        </tr>
                                    </tbody>
                                    <tbody>
                                    {data.map((item, index) => {
                                        // Cek jumlah baris yang harus di-merge berdasarkan greige_id
                                        const rowSpan = index === 0 || item.greige_id !== data[index - 1].greige_id
                                            ? data.filter(d => d.greige_id === item.greige_id).length
                                            : 0;

                                        return (
                                            <tr key={index}>
                                                <td className='py-0'>{item.nama_kain}</td>
                                                <td className='py-0'>{item.lot_lusi}</td>
                                                <td className='py-0'>{item.lot_pakan}</td>
                                                <td className='py-0'>
                                                    {item.note ? (
                                                        <span
                                                            className='text-dark text-decoration-none'
                                                            style={{cursor: 'pointer'}}
                                                            onClick={() => {
                                                                setNote(item.note);
                                                                setShowModal(true);
                                                            }}
                                                        >
                                                            {item.note}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className='py-0'>{kondisiGreige[item.status_tsd]}</td>
                                                <td className='py-0'>{asalGreige[item.asal_greige]}</td>
                                                <td className='py-0'>{item.lebar_kain}</td>
                                                {rowSpan > 0 && (
                                                    <td rowSpan={rowSpan} className='fw-bold py-0 text-center' style={{fontSize: "13px"}}>
                                                        <div>
                                                            {data.filter(d => d.greige_id === item.greige_id)
                                                                .reduce((total, d) => total + (d.total_panjang || 0), 0)
                                                                .toLocaleString('id-ID')}
                                                        </div>
                                                        {renderSettingText(data.filter(d => d.greige_id === item.greige_id)) && (
                                                            <div className='fw-normal text-muted' style={{fontSize: "10px", lineHeight: "1.2"}}>
                                                                {renderSettingText(data.filter(d => d.greige_id === item.greige_id))}
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <td key={i}>{item.grade[i] ? item.grade[i].toLocaleString('id-ID') : 0}</td>
                                                ))}
                                                <td className='py-0'>{item.total_panjang}</td>
                                            </tr>
                                        );
                                    })}

                                    </tbody>
                                </Table>
                                </>
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
        <Modal
            show={showModal}
            onHide={() => setShowModal(false)}
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    Keterangan
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>{note}</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Tutup
                </Button>
            </Modal.Footer>
        </Modal>
            </>

    );
};

export default LaporanStockGreige;

