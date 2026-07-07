import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Modal, Stack } from 'react-bootstrap';
import axiosInstance from '../axiosConfig';
import moment from 'moment';
import { FiPrinter } from "react-icons/fi";
import { RiFileExcel2Fill } from "react-icons/ri";
import Bottom from './Layouts/Bottom/Bottom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const LaporanStockGreige = () => {
    const [data, setData] = useState([]);
    const [startDate, setStartDate] = useState('2021-01-01');
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
    const [params, setParams] = useState({});
    const [isSearchingProcess, setSearchingProcess] = useState(false);
    const [note, setNote] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const printRef = useRef();

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

    const handleSearch = (e) => {
        e.preventDefault();
    
        const combineParams = { ...params, start_date: startDate, end_date: endDate };
        setSearchingProcess(true); 
        axiosInstance.get(`greige/rekap-stock-greige`, { params: combineParams })
            .then(response => {
                // Kelompokkan data berdasarkan greige_id dan akumulasikan nilainya
                const rawData = response.data.data;
                const aggregated = Object.values(rawData.reduce((acc, item) => {
                    const id = item.greige_id;
                    if (!acc[id]) {
                        acc[id] = {
                            ...item,
                            // Pastikan grade berupa object angka penampung total
                            grade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                            total_panjang: 0,
                            notes_array: item.note ? [item.note] : []
                        };
                    } else {
                        if (item.note && !acc[id].notes_array.includes(item.note)) {
                            acc[id].notes_array.push(item.note);
                        }
                    }

                    // Akumulasikan grade 1-5
                    [1, 2, 3, 4, 5].forEach(g => {
                        const val = item.grade && item.grade[g] ? Number(item.grade[g]) : 0;
                        acc[id].grade[g] += val;
                    });

                    // Akumulasikan total panjang
                    acc[id].total_panjang += item.total_panjang ? Number(item.total_panjang) : 0;

                    return acc;
                }, {}));

                // Gabungkan notes_array kembali menjadi satu string dipisah koma
                aggregated.forEach(item => {
                    item.note = item.notes_array.join(', ') || '-';
                });

                // Urutkan berdasarkan greige_id
                setData(aggregated.sort((a, b) => (a.greige_id > b.greige_id) ? 1 : -1));
            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                setSearchingProcess(false);
            });
    }

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

    // Fungsi untuk convert data ke Excel
    const handleExportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Stock Greige');

        // Tambahkan header (Lusi dan Pakan Dihapus)
        worksheet.addRow([
            'Motif', 'Keterangan', 'Kondisi Greige', 'Asal Greige', 
            'Lebar Kain', 'Jumlah Stock', 'Available', 'A', 'B', 'C', 'D', 'X', 'Total'
        ]);

        // Tambahkan data
        data.forEach(item => {
            worksheet.addRow([
                item.nama_kain,
                item.note || '-',
                kondisiGreige[item.status_tsd],
                asalGreige[item.asal_greige],
                item.lebar_kain || '-',
                item.total_panjang,
                item.available ? Number(item.available) : 0,
                item.grade[1] || 0,
                item.grade[2] || 0,
                item.grade[3] || 0,
                item.grade[4] || 0,
                item.grade[5] || 0,
                item.total_panjang
            ]);
        });

        // Atur auto width
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Laporan_Stock_Greige.xlsx');
    };

    return (
        <>
        <Container fluid className="mt-3" style={{ fontSize: '12px', width: '95%', marginBottom: '14rem' }}>
            <Row>
                <Col>
                    <Card>
                        <Card.Header as="h5" className='bg-burgundy-gradient bg-pattern-container text-white py-3'>Laporan Stock Greige (Per Greige ID)</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSearch}>
                                <Row>
                                    <Col md={4} lg={4} sm={6} className='mt-2'>
                                        <Form.Group controlId="startDate">
                                            <Form.Label>Tanggal Mulai</Form.Label>
                                            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4} lg={4} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
                                            <Form.Label>Tanggal Akhir</Form.Label>
                                            <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                    <Col className='mt-2'>
                                        <Form.Group controlId="motif">
                                            <Form.Label>Motif</Form.Label>
                                            <Form.Control type="text" onChange={(e) => setParams((prevParams) => ({ ...prevParams, motif: e.target.value }))} />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6} lg={6} sm={6} className='mt-2'>
                                        <Form.Group controlId="kondisiGreige">
                                            <Form.Label>Kondisi Greige</Form.Label>
                                            <Form.Control as="select" onChange={(e) => setParams((prevParams) => ({ ...prevParams, kondisi_greige: e.target.value }))}>
                                                <option value="">Pilih Kondisi</option>
                                                <option value="1">Salur Muda</option>
                                                <option value="2">Salur Tua</option>
                                                <option value="3">Salur Abnormal</option>
                                                <option value="4">Normal</option>
                                                <option value="5">Lain-lain</option>
                                                <option value="6">TSD</option>
                                            </Form.Control>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6} lg={6} sm={6} className='mt-2'>
                                        <Form.Group controlId="asalGreige">
                                            <Form.Label>Asal Greige</Form.Label>
                                            <Form.Control as="select" onChange={(e) => setParams((prevParams) => ({ ...prevParams, asal_greige: e.target.value }))}>
                                                <option value="">Pilih Asal</option>
                                                <option value="1"> WATER JET LOOM </option>
                                                <option value="2"> BELI </option>
                                                <option value="3"> RAPIER </option>
                                                <option value="4"> BELI IMPORT </option>
                                                <option value="5"> LAIN-LAIN </option>
                                                <option value="6"> RETUR </option>
                                                <option value="7"> MUTASI </option>
                                                <option value="8"> PEMOTONGAN </option>
                                                <option value="9"> MAKLOON </option>
                                            </Form.Control>
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button type='submit' variant="burgundy" className='mt-2 w-100' disabled={isSearchingProcess}>
                                    {isSearchingProcess ? <Spinner size='sm'/> : 'Cari'}
                                </Button>
                            </Form>
                            <div className='py-2'>
                                {data?.length !== 0 && <p>Ditemukan {data?.length || 0} kelompok data greige</p>}
                            </div>
                            <div className='px-2 position-absolute' style={{ right: 15 }}>
                                <Stack direction='horizontal' gap={2}>
                                    <Button as="a" target="_blank" href={`/laporan-stock-greige/print?${data.length > 0 ? Object.entries(params).filter(([key, value]) => value !== undefined).concat([["start_date", startDate], ["end_date", endDate]]).map(([key, value]) => `${key}=${value}`).join("&") : ""}`} variant="warning" className="mt-3 text-white">
                                        <FiPrinter />
                                    </Button>
                                    <Button variant="success" className="mt-3 text-white" onClick={handleExportToExcel}>
                                        <RiFileExcel2Fill/>
                                    </Button>
                                </Stack>
                            </div>

                            <div ref={printRef} className='p-3 border mt-2'>
                                <h4 className='text-center py-4'>REKAP LAPORAN STOCK GREIGE <p className='h6'>PT. GAJAH ANGKASA PERKASA</p></h4>
                                <Table bordered responsive={true} hover style={{ borderColor: "black", fontSize: "11px"}}>
                                    <thead className='text-center bg-light'>
                                        <tr>
                                            <th rowSpan={2} className="align-middle">Motif</th>
                                            {/* <th rowSpan={2} className="align-middle">Keterangan</th> */}
                                            <th rowSpan={2} className="align-middle">Kondisi Greige</th>
                                            <th rowSpan={2} className="align-middle">Asal Greige</th>
                                            <th rowSpan={2} className="align-middle">Lebar Kain</th>
                                            <th rowSpan={2} className="align-middle">Jumlah Stock</th>
                                            <th rowSpan={2} className="align-middle">Available</th> 
                                            <th colSpan={6}>Saldo Akhir (Total Per Greige)</th>
                                        </tr>
                                        <tr>
                                            <th>A</th>
                                            <th>B</th>
                                            <th>C</th>
                                            <th>D</th>
                                            <th>X</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {data.map((item, index) => (
                                        <tr key={index} className="text-center">
                                            <td className='py-1 align-middle'>{item.nama_kain}</td>
                                            {/* <td className='py-1 align-middle'>
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
                                            </td> */}
                                            <td className='py-1 align-middle'>{kondisiGreige[item.status_tsd]}</td>
                                            <td className='py-1 align-middle'>{asalGreige[item.asal_greige]}</td>
                                            <td className='py-1 align-middle'>{item.lebar_kain || '-'}</td>
                                            <td className='py-1 align-middle fw-bold' style={{fontSize: "12px"}}>
                                                {item.total_panjang.toLocaleString('id-ID')}
                                            </td>
                                            <td className='py-1 align-middle fw-bold'>
                                                {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(item.available || 0))}
                                            </td>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <td key={i} className='py-1 align-middle'>
                                                    {item.grade[i] ? item.grade[i].toLocaleString('id-ID') : 0}
                                                </td>
                                            ))}
                                            <td className='py-1 align-middle fw-bold bg-light'>{item.total_panjang.toLocaleString('id-ID')}</td>  
                                        </tr>
                                    ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="text-center fw-bold bg-light">
                                            <td colSpan={4}>GRAND TOTAL</td>
                                            <td>{data.reduce((total, d) => total + d.total_panjang, 0).toLocaleString('id-ID')}</td>
                                            <td>{data.reduce((total, d) => total + Number(d.available || 0), 0).toLocaleString('id-ID')}</td>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <td key={i}>
                                                    {data.reduce((total, d) => total + (d.grade[i] || 0), 0).toLocaleString('id-ID')}
                                                </td>
                                            ))}
                                            <td>{data.reduce((total, d) => total + d.total_panjang, 0).toLocaleString('id-ID')}</td>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
        <Bottom />
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