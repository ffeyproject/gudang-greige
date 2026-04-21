import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Modal, Stack } from 'react-bootstrap';
import axiosInstance from '../axiosConfig';
import moment from 'moment';
import { FiPrinter } from "react-icons/fi";
import { RiFileExcel2Fill } from "react-icons/ri";
import Bottom from './Layouts/Bottom/Bottom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const LaporanStockOpname = () => {
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
        axiosInstance.get(`greige/rekap-stock-greige-opname`, { params: combineParams })
            .then(response => {
                setData(
                    response.data.data.sort((a, b) => (a.greige_id > b.greige_id) ? 1 : -1)
                );
                console.log(response.data.data);

            })
            .catch(error => {
                console.error(error);
                // console.log("payload", combineParams);
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

        // Tambahkan header
        worksheet.addRow([
            'Motif', 'Lot Lusi', 'Lot Pakan', 'Keterangan', 
            'Kondisi Greige', 'Asal Greige', 'Lebar Kain', 
            'Jumlah Stock', 'A', 'B', 'C', 'D', 'X', 'Total'
        ]);

        // Tambahkan data
        data.forEach(item => {
            worksheet.addRow([
                item.nama_kain,
                item.lot_lusi,
                item.lot_pakan,
                item.note || '-',
                kondisiGreige[item.status_tsd],
                asalGreige[item.asal_greige],
                item.lebar_kain,
                data.filter(d => d.greige_id === item.greige_id)
                    .reduce((total, d) => total + d.total_panjang, 0),
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

        // Simpan file
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Laporan_Stock_Greige.xlsx');
    };

    return (
        <>
        <Container fluid className="mt-3" style={{ fontSize: '12px', width: '95%', marginBottom: '14rem' }}>
            <Row>
                <Col>
                    <Card>
                        <Card.Header as="h5" className='bg-burgundy-gradient bg-pattern-container text-white py-3'>Laporan Stock Opname Greige</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSearch}>
                                <Row>
                                    <Col md={3} lg={3} sm={6} className='mt-2'>
                                        <Form.Group controlId="startDate">
                                            <Form.Label>Tanggal Mulai</Form.Label>
                                            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} lg={3} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
                                            <Form.Label>Tanggal Akhir</Form.Label>
                                            <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                        </Form.Group>
                                    </Col>
                                    <Col className='mt-2'>
                                        <Form.Group controlId="endDate">
                                            <Form.Label>Motif</Form.Label>
                                            <Form.Control type="text" onChange={(e) => setParams((prevParams) => ({ ...prevParams, motif: e.target.value }))} />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={2} lg={2} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
                                            <Form.Label>Lot Lusi</Form.Label>
                                            <Form.Control type="text" onChange={(e) => setParams((prevParams) => ({ ...prevParams, lot_lusi: e.target.value }))} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} lg={2} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
                                            <Form.Label>Lot pakan</Form.Label>
                                            <Form.Control type="text" onChange={(e) => setParams((prevParams) => ({ ...prevParams, lot_pakan: e.target.value }))} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4} lg={4} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
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
                                    <Col md={4} lg={4} sm={6} className='mt-2'>
                                        <Form.Group controlId="endDate">
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
                                {data?.length !== 0 && <p>Ditemukan {data?.length || 0} data</p>}
                            </div>
                            <div className='px-2 position-absolute' style={{ right: 15 }}>
                                <Stack direction='horizontal' gap={2}>
                                    <Button as="a" target="_blank" href={`/laporan-stock-opname/print?${data.length > 0 ? Object.entries(params).filter(([key, value]) => value !== undefined).concat([["start_date", startDate], ["end_date", endDate]]).map(([key, value]) => `${key}=${value}`).join("&") : ""}`} variant="warning" className="mt-3 text-white">
                                        <FiPrinter />
                                    </Button>
                                    <Button variant="success" className="mt-3 text-white" onClick={handleExportToExcel}>
                                        <RiFileExcel2Fill/>
                                    </Button>
                                </Stack>
                            </div>

                            <div ref={printRef} className='p-3 border mt-2'>
                                <>
                                <h4 className='text-center py-4'>REKAP LAPORAN STOCK OPNAME GREIGE <p className='h6'>PT. GAJAH ANGKASA PERKASA</p></h4>
                                <Table bordered responsive={true} hover style={{ borderColor: "black", fontSize: "11px"}}>
                                    <tbody className='text-center'>
                                        <tr>
                                            <th rowSpan={2}>Motif</th>
                                            <th colSpan={2}>Lot</th>
                                            <th rowSpan={2}>Keterangan</th>
                                            <th rowSpan={2}>Kondisi Greige</th>
                                            <th rowSpan={2}>Asal Greige</th>
                                            <th rowSpan={2}>lebar Kain</th>
                                            <th rowSpan={2}>Jumlah Stock</th>
                                            {/* <th rowSpan={2}>Available</th>  */}
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
                                                    <React.Fragment>
                                                        <td rowSpan={rowSpan} className='fw-bold py-0' style={{fontSize: "13px"}}>
                                                            {data.filter(d => d.greige_id === item.greige_id)
                                                                .reduce((total, d) => total + d.total_panjang, 0)
                                                                .toLocaleString('id-ID')}
                                                        </td>
                                                        {/* <td rowSpan={rowSpan} className='fw-bold py-0'>{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(item.available)}</td> */}
                                                    </React.Fragment>
                                                )}
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <td key={i}>{item.grade[i] ? item.grade[i].toLocaleString('id-ID') : 0}</td>
                                                ))}
                                                <td className='py-0'>{item.total_panjang}</td>  
                                            </tr>
                                            );
                                        })}

                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={7} className='fw-bold'>TOTAL</td>
                                            <td className='fw-bold'style={{fontSize: "13px"}}>{data.reduce((total, d) => total + d.total_panjang, 0).toLocaleString('id-ID')}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </Table>
                                </>
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

export default LaporanStockOpname;

