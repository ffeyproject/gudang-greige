import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Spinner,
  Modal,
  Stack,
  Badge,
  Nav,
  Pagination,
  Alert
} from 'react-bootstrap';
import axiosInstance from '../axiosConfig';
import axios from 'axios';
import moment from 'moment';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Bottom from './Layouts/Bottom/Bottom';
import ConfirmModal from '../Components/ConfirmModal';

// Icons
import {
  FiCalendar,
  FiSearch,
  FiRefreshCw,
  FiCamera,
  FiTrash2,
  FiEye,
  FiLayers,
  FiGrid,
  FiList,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiClock,
  FiInbox,
  FiTrendingUp,
  FiTrendingDown,
  FiCheckCircle,
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiMove
} from 'react-icons/fi';
import { RiFileExcel2Fill } from 'react-icons/ri';
import { FaBoxesStacked, FaTruckFast } from 'react-icons/fa6';

const asalGreigeDefaultOptions = {
  1: 'Water Jet Loom',
  2: 'Beli Lokal',
  3: 'Rapier',
  4: 'Beli Import',
  5: 'Lain-lain',
  6: 'Retur',
  7: 'Mutasi',
  8: 'Pemotongan',
  9: 'Makloon',
};

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatInteger = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('id-ID');
};

const StockGreigeDaily = () => {
  document.title = 'Gudang Greige | Stok Harian & Mutasi';

  // Active Tab: 'list' | 'incoming' | 'matrix'
  const [activeTab, setActiveTab] = useState('list');

  // ---------- LIST VIEW STATE ----------
  const [listData, setListData] = useState([]);
  const [latestSnapshotAt, setLatestSnapshotAt] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [warehouseEntryDates, setWarehouseEntryDates] = useState([]);
  const [asalGreigeOptions, setAsalGreigeOptions] = useState(asalGreigeDefaultOptions);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0,
  });

  // Filters for List
  const [filterDateMode, setFilterDateMode] = useState('single'); // 'single' | 'month' | 'range' | 'all'
  const [filterDate, setFilterDate] = useState(moment().format('YYYY-MM-DD'));
  const [filterMonth, setFilterMonth] = useState(moment().format('YYYY-MM'));
  const [filterStartDate, setFilterStartDate] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [filterEndDate, setFilterEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [filterMotif, setFilterMotif] = useState('');
  const [filterAsalGreige, setFilterAsalGreige] = useState('');
  const [onlyIncoming, setOnlyIncoming] = useState(false); // ?only_incoming=1 filter
  const [perPage, setPerPage] = useState(20);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isExportLoading, setIsExportLoading] = useState(false);

  // ---------- INCOMING SUMMARY WIDGET STATE ----------
  const [incomingSummaryList, setIncomingSummaryList] = useState([]);
  const [isIncomingLoading, setIsIncomingLoading] = useState(false);

  // ---------- MATRIX VIEW STATE ----------
  const [matrixStartDate, setMatrixStartDate] = useState(moment().subtract(13, 'days').format('YYYY-MM-DD'));
  const [matrixEndDate, setMatrixEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [matrixMotif, setMatrixMotif] = useState('');
  const [matrixAsalGreige, setMatrixAsalGreige] = useState('');
  const [matrixDates, setMatrixDates] = useState([]);
  const [matrixMotifs, setMatrixMotifs] = useState([]);
  const [matrixData, setMatrixData] = useState({});
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);

  // Filtered matrix motifs based on live search motif
  const displayedMatrixMotifs = useMemo(() => {
    if (!matrixMotif.trim()) return matrixMotifs;
    const q = matrixMotif.trim().toLowerCase();
    return matrixMotifs.filter((m) => {
      const nama = (m.nama || '').toLowerCase();
      const asal = (m.asal_greige_name || asalGreigeOptions[m.asal_greige] || '').toLowerCase();
      return nama.includes(q) || asal.includes(q);
    });
  }, [matrixMotifs, matrixMotif, asalGreigeOptions]);

  // ---------- MATRIX SCROLL & DRAG TO PAN (High-Performance Zero-Rerender) ----------
  const matrixScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const rafIdRef = useRef(null);

  const handleMatrixMouseDown = (e) => {
    if (e.button !== 0) return;
    const slider = matrixScrollRef.current;
    if (!slider) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - slider.offsetLeft;
    scrollLeftRef.current = slider.scrollLeft;

    slider.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onGlobalMouseUp = () => {
      isDraggingRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (slider) {
        slider.style.cursor = 'grab';
      }
      document.body.style.userSelect = '';
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

  const handleMatrixMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const slider = matrixScrollRef.current;
    if (!slider) return;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      if (slider) {
        slider.scrollLeft = scrollLeftRef.current - walk;
      }
    });
  };

  const scrollMatrix = (direction, distance = 400) => {
    if (matrixScrollRef.current) {
      matrixScrollRef.current.scrollBy({
        left: direction === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
    }
  };

  const scrollMatrixToEdge = (edge) => {
    if (matrixScrollRef.current) {
      matrixScrollRef.current.scrollTo({
        left: edge === 'start' ? 0 : matrixScrollRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  };

  // ---------- SNAPSHOT MODAL STATE ----------
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(moment().format('YYYY-MM-DD'));
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);

  // ---------- DETAIL MODAL STATE ----------
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailIncomingRolls, setDetailIncomingRolls] = useState([]);
  const [detailHourlySummary, setDetailHourlySummary] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // ---------- DELETE MODAL STATE ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ---------- ALERTS & TOASTS ----------
  const [alertInfo, setAlertInfo] = useState(null); // { type: 'success'|'danger'|'info', message: '' }

  // API helper with URL resolution fallback
  const requestApi = useCallback(async (method, relativePath, options = {}) => {
    try {
      return await axiosInstance[method](relativePath, options);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        const currentBase = axiosInstance.defaults.baseURL || '';
        let altUrl = '';
        if (currentBase.includes('/v1')) {
          altUrl = currentBase.replace('/v1', '') + relativePath;
        } else if (!currentBase.endsWith('/api/')) {
          altUrl = `${currentBase}api/${relativePath}`;
        }
        if (altUrl) {
          const token = localStorage.getItem('token');
          return await axios({
            method,
            url: altUrl,
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          });
        }
      }
      throw err;
    }
  }, []);

  const isInitialMount = useRef(true);
  const abortControllerRef = useRef(null);

  // ---------- FETCH LIST DATA ----------
  const fetchListData = useCallback(async (page = 1, autoSnapshot = false, customMotif = null) => {
    // Batalkan request pencarian sebelumnya yang masih in-flight agar respon instan & tidak tabrakan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsListLoading(true);
    setAlertInfo(null);
    try {
      const motifValue = customMotif !== null ? customMotif : filterMotif;
      const params = {
        page,
        per_page: perPage,
      };

      if (autoSnapshot) {
        params.auto_snapshot = 1;
      }

      if (filterDateMode === 'single' && filterDate) {
        params.date = filterDate;
      } else if (filterDateMode === 'month') {
        if (filterMonth) {
          params.start_date = moment(filterMonth, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
          params.end_date = moment(filterMonth, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
        }
      } else if (filterDateMode === 'range') {
        if (filterStartDate) params.start_date = filterStartDate;
        if (filterEndDate) params.end_date = filterEndDate;
      }

      if (motifValue && motifValue.trim()) {
        params.motif = motifValue.trim();
      }
      if (filterAsalGreige) {
        params.asal_greige = filterAsalGreige;
      }
      if (onlyIncoming) {
        params.only_incoming = 1;
      }

      const response = await requestApi('get', 'stock-greige-daily/index', { params, signal });
      const res = response.data;

      if (res && (res.success || res.status === 'success')) {
        setListData(res.data || []);
        if (res.latest_snapshot_at) {
          setLatestSnapshotAt(res.latest_snapshot_at);
        }
        if (res.available_dates && res.available_dates.length > 0) {
          setAvailableDates(res.available_dates);
          if (!filterDate && res.available_dates[0]) {
            setFilterDate(res.available_dates[0]);
          }
        }
        if (res.warehouse_entry_dates) {
          setWarehouseEntryDates(res.warehouse_entry_dates);
        }
        if (res.asal_greige_options) {
          setAsalGreigeOptions(res.asal_greige_options);
        }
        setSummary(res.summary || null);
        if (res.pagination) {
          setPagination({
            currentPage: res.pagination.current_page || 1,
            lastPage: res.pagination.last_page || 1,
            perPage: res.pagination.per_page || perPage,
            total: res.pagination.total || 0,
          });
        }
      }
    } catch (error) {
      // Abaikan jika error terjadi karena request sebelumnya sengaja dibatalkan
      if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') {
        return;
      }
      console.error('Error fetching list stock greige daily:', error);
      const errMsg = error.response?.data?.message || 'Gagal memuat data stok greige harian.';
      setAlertInfo({ type: 'danger', message: errMsg });
    } finally {
      setIsListLoading(false);
    }
  }, [filterDateMode, filterDate, filterMonth, filterStartDate, filterEndDate, filterMotif, filterAsalGreige, onlyIncoming, perPage, requestApi]);

  // ---------- FETCH INCOMING SUMMARY WIDGET ----------
  const fetchIncomingSummary = useCallback(async () => {
    setIsIncomingLoading(true);
    try {
      const response = await requestApi('get', 'stock-greige-daily/incoming-summary');
      const res = response.data;
      if (res && (res.success || res.status === 'success')) {
        setIncomingSummaryList(res.physical_incoming_by_date || []);
        if (res.latest_snapshot_at) {
          setLatestSnapshotAt(res.latest_snapshot_at);
        }
      }
    } catch (error) {
      console.error('Error fetching incoming summary:', error);
    } finally {
      setIsIncomingLoading(false);
    }
  }, [requestApi]);

  // ---------- FETCH MATRIX DATA ----------
  const fetchMatrixData = useCallback(async (customMotif = null) => {
    setIsMatrixLoading(true);
    setAlertInfo(null);
    try {
      const motifValue = customMotif !== null ? customMotif : matrixMotif;
      const params = {
        startDate: matrixStartDate,
        endDate: matrixEndDate,
      };
      if (motifValue && motifValue.trim()) {
        params.motif = motifValue.trim();
      }
      if (matrixAsalGreige) {
        params.asal_greige = matrixAsalGreige;
      }

      const response = await requestApi('get', 'stock-greige-daily/matrix', { params });
      const res = response.data;

      if (res && (res.success || res.status === 'success')) {
        setMatrixDates(res.dates || []);
        setMatrixMotifs(res.motifs || []);
        setMatrixData(res.matrixData || {});
      }
    } catch (error) {
      console.error('Error fetching matrix stock greige daily:', error);
      const errMsg = error.response?.data?.message || 'Gagal memuat matriks stok greige harian.';
      setAlertInfo({ type: 'danger', message: errMsg });
    } finally {
      setIsMatrixLoading(false);
    }
  }, [matrixStartDate, matrixEndDate, matrixMotif, matrixAsalGreige, requestApi]);

  // Live search debounce saat user mengetik motif di tab matrix
  useEffect(() => {
    if (activeTab !== 'matrix') return;
    const timer = setTimeout(() => {
      fetchMatrixData(matrixMotif);
    }, 450);
    return () => clearTimeout(timer);
  }, [matrixMotif, activeTab, fetchMatrixData]);

  // Initial load: Otomatis memicu snapshot fisik hari ini SEKALI saja saat halaman pertama kali dibuka
  useEffect(() => {
    fetchListData(1, true);
    fetchIncomingSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced live search saat mengetik motif (responsif tanpa delay)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchListData(1, false, filterMotif);
    }, 350);
    return () => clearTimeout(timer);
  }, [filterMotif, fetchListData]);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchMatrixData();
    } else if (activeTab === 'incoming') {
      fetchIncomingSummary();
    }
  }, [activeTab, fetchMatrixData, fetchIncomingSummary]);

  // ---------- SAVE SNAPSHOT ----------
  const handleSaveSnapshot = async () => {
    setIsSnapshotLoading(true);
    try {
      const response = await requestApi('post', 'stock-greige-daily/save-snapshot', {
        date: snapshotDate,
      });
      const res = response.data;

      if (res && (res.success || res.status === 'success')) {
        setAlertInfo({
          type: 'success',
          message: res.message || 'Snapshot stok harian berhasil disimpan!',
        });
        setShowSnapshotModal(false);
        setFilterDateMode('single');
        setFilterDate(snapshotDate);
        fetchListData(1);
        fetchIncomingSummary();
        if (activeTab === 'matrix') {
          fetchMatrixData();
        }
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
      const errMsg = error.response?.data?.message || 'Gagal mengambil snapshot stok greige harian.';
      setAlertInfo({ type: 'danger', message: errMsg });
    } finally {
      setIsSnapshotLoading(false);
    }
  };

  // ---------- VIEW DETAIL ----------
  const handleViewDetail = async (id) => {
    setIsDetailLoading(true);
    setShowDetailModal(true);
    setDetailItem(null);
    setDetailIncomingRolls([]);
    setDetailHourlySummary([]);
    try {
      const response = await requestApi('get', `stock-greige-daily/detail/${id}`);
      const res = response.data;
      if (res && (res.success || res.status === 'success')) {
        setDetailItem(res.data);
        setDetailIncomingRolls(res.incoming_rolls || []);
        setDetailHourlySummary(res.hourly_summary || []);
      }
    } catch (error) {
      console.error('Error getting detail:', error);
      const errMsg = error.response?.data?.message || 'Gagal memuat detail data stok.';
      setAlertInfo({ type: 'danger', message: errMsg });
      setShowDetailModal(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ---------- DELETE RECORD ----------
  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (confirmed) => {
    if (!confirmed || !itemToDelete) {
      setShowDeleteModal(false);
      setItemToDelete(null);
      return;
    }

    try {
      const response = await requestApi('delete', `stock-greige-daily/delete/${itemToDelete.id}`);
      const res = response.data;
      if (res && (res.success || res.status === 'success')) {
        setAlertInfo({
          type: 'success',
          message: res.message || 'Data rekaman stok harian berhasil dihapus.',
        });
        fetchListData(pagination.currentPage);
        fetchIncomingSummary();
        if (activeTab === 'matrix') {
          fetchMatrixData();
        }
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      const errMsg = error.response?.data?.message || 'Gagal menghapus rekaman stok harian.';
      setAlertInfo({ type: 'danger', message: errMsg });
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  // ---------- EXPORT TO EXCEL / CSV (Streamed Endpoint) ----------
  // ---------- EXPORT ALL FILTERED & SEARCHED DATA TO EXCEL (.xlsx) ----------
  const handleExportAllExcel = async () => {
    setIsExportLoading(true);
    setAlertInfo({ type: 'info', message: 'Mempersiapkan seluruh data stok untuk diekspor ke Excel...' });
    try {
      const params = {
        all: 1, // Meminta seluruh data dari backend tanpa terpotong pagination
      };

      if (filterDateMode === 'single' && filterDate) {
        params.date = filterDate;
      } else if (filterDateMode === 'month') {
        if (filterMonth) {
          params.start_date = moment(filterMonth, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
          params.end_date = moment(filterMonth, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
        }
      } else if (filterDateMode === 'range') {
        if (filterStartDate) params.start_date = filterStartDate;
        if (filterEndDate) params.end_date = filterEndDate;
      }

      if (filterMotif.trim()) {
        params.motif = filterMotif.trim();
      }
      if (filterAsalGreige) {
        params.asal_greige = filterAsalGreige;
      }
      if (onlyIncoming) {
        params.only_incoming = 1;
      }

      // Ambil seluruh data hasil pencarian
      const response = await requestApi('get', 'stock-greige-daily/index', { params });
      const res = response.data;
      const exportItems = res?.data || [];

      if (!exportItems.length) {
        setAlertInfo({
          type: 'danger',
          message: 'Tidak ada data stok yang sesuai dengan kriteria pencarian untuk diekspor.',
        });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stok Greige Harian');

      // Header Judul & Metadata Laporan
      worksheet.addRow(['REKAP LAPORAN STOK GREIGE HARIAN - PT. GAJAH ANGKASA PERKASA']);
      worksheet.addRow([
        filterDateMode === 'single'
          ? `Per Tanggal: ${moment(filterDate).format('DD MMMM YYYY')}`
          : filterDateMode === 'month'
          ? `Per Bulan: ${moment(filterMonth, 'YYYY-MM').format('MMMM YYYY').toUpperCase()}`
          : filterDateMode === 'range'
          ? `Periode: ${moment(filterStartDate).format('DD/MM/YYYY')} s/d ${moment(filterEndDate).format('DD/MM/YYYY')}`
          : 'Semua Tanggal Snapshot',
      ]);
      worksheet.addRow([
        `Total Rekaman: ${exportItems.length} Data | Dicetak Pada: ${moment().format('DD/MM/YYYY HH:mm:ss')}${
          filterMotif.trim() ? ` | Filter Motif: ${filterMotif.trim()}` : ''
        }${filterAsalGreige ? ` | Asal: ${asalGreigeOptions[filterAsalGreige] || filterAsalGreige}` : ''}`,
      ]);
      worksheet.addRow([]);

      // Baris Header Kolom (Row 5)
      worksheet.addRow([
        'No',
        'Tanggal',
        'Motif / Nama Kain',
        'Asal Greige',
        'Stok Kemarin (m)',
        'Roll Kemarin',
        'Stock Masuk Hari Ini (m)',
        'Roll Masuk Hari Ini',
        'Perubahan (+/-) (m)',
        'Perubahan (+/-) Roll',
        'Jumlah Stock (m)',
        'Jumlah Roll',
        'Grade A (m)',
        'Grade B (m)',
        'Grade C (m)',
        'Grade D (m)',
        'Grade NG / X (m)',
        'Total Saldo (m)',
      ]);

      const headerRow = worksheet.getRow(5);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF660033' }, // Burgundy GAP
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Highlight kolom Stock Masuk Hari Ini (Index 7 & 8)
      headerRow.getCell(7).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' },
      };
      headerRow.getCell(8).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' },
      };

      // Summary totals accumulation
      let sumPrevM = 0;
      let sumPrevRoll = 0;
      let sumTodayM = 0;
      let sumTodayRoll = 0;
      let sumDiffM = 0;
      let sumDiffRoll = 0;
      let sumTotalM = 0;
      let sumTotalRoll = 0;
      let sumGradeA = 0;
      let sumGradeB = 0;
      let sumGradeC = 0;
      let sumGradeD = 0;
      let sumGradeNG = 0;

      exportItems.forEach((item, index) => {
        const dateStr =
          item.formatted_date ||
          (typeof item.date === 'string'
            ? item.date.substring(0, 10)
            : moment(item.date).format('YYYY-MM-DD'));
        const motifName = item.greige_nama_kain || item.greige?.nama_kain || '-';
        const asalName = item.asal_greige_name || asalGreigeOptions[item.asal_greige] || '-';
        const diffPanjang = Number(item.diff_panjang || 0);
        const diffRoll = Number(item.diff_roll || 0);

        const todayStockM = Number(
          item.stock_hari_ini_m !== undefined && item.stock_hari_ini_m !== null
            ? item.stock_hari_ini_m
            : diffPanjang > 0
            ? diffPanjang
            : 0
        );
        const todayStockRoll = Number(
          item.stock_hari_ini_roll !== undefined && item.stock_hari_ini_roll !== null
            ? item.stock_hari_ini_roll
            : diffRoll > 0
            ? diffRoll
            : 0
        );

        const prevStockM =
          item.prev_total_panjang !== null && item.prev_total_panjang !== undefined
            ? Number(item.prev_total_panjang)
            : Math.max(0, Number(item.total_panjang || 0) - todayStockM);
        const prevStockRoll =
          item.prev_total_roll !== null && item.prev_total_roll !== undefined
            ? Number(item.prev_total_roll)
            : Math.max(0, Number(item.total_roll || 0) - todayStockRoll);

        const totalPanjang = Number(item.total_panjang || 0);
        const totalRoll = Number(item.total_roll || 0);
        const gradeA = Number(item.grade_a || 0);
        const gradeB = Number(item.grade_b || 0);
        const gradeC = Number(item.grade_c || 0);
        const gradeD = Number(item.grade_d || 0);
        const gradeNG = Number(item.grade_ng || 0);

        // Accumulate totals
        sumPrevM += prevStockM;
        sumPrevRoll += prevStockRoll;
        sumTodayM += todayStockM;
        sumTodayRoll += todayStockRoll;
        sumDiffM += diffPanjang;
        sumDiffRoll += diffRoll;
        sumTotalM += totalPanjang;
        sumTotalRoll += totalRoll;
        sumGradeA += gradeA;
        sumGradeB += gradeB;
        sumGradeC += gradeC;
        sumGradeD += gradeD;
        sumGradeNG += gradeNG;

        const row = worksheet.addRow([
          index + 1,
          dateStr,
          motifName,
          asalName,
          prevStockM,
          prevStockRoll,
          todayStockM,
          todayStockRoll,
          diffPanjang,
          diffRoll,
          totalPanjang,
          totalRoll,
          gradeA,
          gradeB,
          gradeC,
          gradeD,
          gradeNG,
          totalPanjang,
        ]);

        // Formats & alignments
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'left' };
        row.getCell(4).alignment = { horizontal: 'center' };

        // Numbers format
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '#,##0';
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(8).numFmt = '#,##0';
        row.getCell(9).numFmt = '#,##0.00';
        row.getCell(10).numFmt = '#,##0';
        row.getCell(11).numFmt = '#,##0.00';
        row.getCell(12).numFmt = '#,##0';
        row.getCell(13).numFmt = '#,##0.00';
        row.getCell(14).numFmt = '#,##0.00';
        row.getCell(15).numFmt = '#,##0.00';
        row.getCell(16).numFmt = '#,##0.00';
        row.getCell(17).numFmt = '#,##0.00';
        row.getCell(18).numFmt = '#,##0.00';

        // Highlight cells for Stock Masuk Hari Ini
        row.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' },
        };
        row.getCell(8).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' },
        };
      });

      // Baris TOTAL
      const totalRow = worksheet.addRow([
        'TOTAL',
        '',
        '',
        '',
        sumPrevM,
        sumPrevRoll,
        sumTodayM,
        sumTodayRoll,
        sumDiffM,
        sumDiffRoll,
        sumTotalM,
        sumTotalRoll,
        sumGradeA,
        sumGradeB,
        sumGradeC,
        sumGradeD,
        sumGradeNG,
        sumTotalM,
      ]);

      totalRow.font = { bold: true };
      totalRow.alignment = { vertical: 'middle' };
      totalRow.getCell(1).alignment = { horizontal: 'center' };

      for (let colIdx = 5; colIdx <= 18; colIdx++) {
        if (colIdx === 6 || colIdx === 8 || colIdx === 10 || colIdx === 12) {
          totalRow.getCell(colIdx).numFmt = '#,##0';
        } else {
          totalRow.getCell(colIdx).numFmt = '#,##0.00';
        }
      }

      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };

      // Auto Widths
      worksheet.columns = [
        { width: 6 },  // No
        { width: 14 }, // Tanggal
        { width: 28 }, // Motif
        { width: 18 }, // Asal
        { width: 16 }, // Stok Kemarin m
        { width: 14 }, // Roll Kemarin
        { width: 18 }, // Stock Masuk Hari Ini m
        { width: 15 }, // Roll Masuk Hari Ini
        { width: 16 }, // Perubahan m
        { width: 15 }, // Perubahan roll
        { width: 18 }, // Jumlah Stock m
        { width: 14 }, // Jumlah roll
        { width: 14 }, // Grade A
        { width: 14 }, // Grade B
        { width: 14 }, // Grade C
        { width: 14 }, // Grade D
        { width: 14 }, // Grade NG
        { width: 18 }, // Total m
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const filterDesc = filterMotif.trim() ? `_${filterMotif.trim().replace(/\s+/g, '_')}` : '';
      const filename = `rekap_stock_greige_harian${filterDesc}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      saveAs(blob, filename);

      setAlertInfo({
        type: 'success',
        message: `File Excel berhasil diekspor (${exportItems.length} rekaman data stok lengkap).`,
      });
    } catch (err) {
      console.error('Export all excel error:', err);
      setAlertInfo({ type: 'danger', message: 'Gagal mengekspor data ke file Excel.' });
    } finally {
      setIsExportLoading(false);
    }
  };

  // ---------- EXPORT MATRIX TO EXCEL ----------
  const handleExportMatrixExcel = async () => {
    const motifsToExport = displayedMatrixMotifs.length > 0 ? displayedMatrixMotifs : matrixMotifs;
    if (!matrixDates.length || !motifsToExport.length) {
      setAlertInfo({ type: 'danger', message: 'Tidak ada data matriks untuk diekspor.' });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Matriks Pergerakan Stok');

      worksheet.addRow(['MATRIKS PERGERAKAN STOK GREIGE - PT. GAJAH ANGKASA PERKASA']);
      worksheet.addRow([`Periode: ${matrixStartDate} s/d ${matrixEndDate}`]);
      worksheet.addRow([]);

      const headerCols = ['No', 'Motif / Nama Kain', 'Asal Greige'];
      matrixDates.forEach((d) => {
        headerCols.push(`${moment(d).format('DD/MM')} (m)`);
        headerCols.push(`${moment(d).format('DD/MM')} (Roll)`);
        headerCols.push(`${moment(d).format('DD/MM')} (+/- m)`);
      });
      worksheet.addRow(headerCols);

      const headerRow = worksheet.getRow(4);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF660033' },
      };

      motifsToExport.forEach((motif, idx) => {
        const rowData = [
          idx + 1,
          motif.nama || '-',
          motif.asal_greige_name || asalGreigeOptions[motif.asal_greige] || '-',
        ];

        matrixDates.forEach((d) => {
          const entry = matrixData[motif.composite_key] && matrixData[motif.composite_key][d];
          if (entry) {
            rowData.push(Number(entry.qty || 0));
            rowData.push(Number(entry.roll || 0));
            rowData.push(Number(entry.diff_qty || 0));
          } else {
            rowData.push(0);
            rowData.push(0);
            rowData.push(0);
          }
        });
        worksheet.addRow(rowData);
      });

      worksheet.columns.forEach((col) => {
        col.width = 14;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `matriks_stock_greige_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
      setAlertInfo({ type: 'success', message: 'File Matriks Excel berhasil diunduh.' });
    } catch (err) {
      console.error('Matrix excel export error:', err);
      setAlertInfo({ type: 'danger', message: 'Gagal mengekspor file matriks Excel.' });
    }
  };

  // ---------- RENDER SMART PAGINATION ITEMS ----------
  const renderPaginationItems = () => {
    const current = pagination.currentPage;
    const total = pagination.lastPage;

    if (total <= 1) return null;

    // Jika total halaman sedikit (<= 7), tampilkan semua nomor langsung
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <Pagination.Item
          key={page}
          active={page === current}
          disabled={isListLoading}
          onClick={() => fetchListData(page)}
        >
          {page}
        </Pagination.Item>
      ));
    }

    // Jika total halaman > 7, gunakan sliding window dengan ellipsis (...)
    const items = [];

    // Selalu tampilkan halaman 1
    items.push(
      <Pagination.Item
        key={1}
        active={current === 1}
        disabled={isListLoading}
        onClick={() => fetchListData(1)}
      >
        1
      </Pagination.Item>
    );

    // Tentukan range nomor tengah
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);

    if (current <= 4) {
      start = 2;
      end = 5;
    } else if (current >= total - 3) {
      start = total - 4;
      end = total - 1;
    }

    // Ellipsis awal jika ada jarak dari halaman 1
    if (start > 2) {
      items.push(<Pagination.Ellipsis key="ellipsis-start" disabled />);
    }

    // Nomor-nomor di range tengah
    for (let p = start; p <= end; p++) {
      items.push(
        <Pagination.Item
          key={p}
          active={p === current}
          disabled={isListLoading}
          onClick={() => fetchListData(p)}
        >
          {p}
        </Pagination.Item>
      );
    }

    // Ellipsis akhir jika ada jarak ke halaman terakhir
    if (end < total - 1) {
      items.push(<Pagination.Ellipsis key="ellipsis-end" disabled />);
    }

    // Selalu tampilkan halaman terakhir
    items.push(
      <Pagination.Item
        key={total}
        active={current === total}
        disabled={isListLoading}
        onClick={() => fetchListData(total)}
      >
        {total}
      </Pagination.Item>
    );

    return items;
  };

  return (
    <>
      <Container fluid className="mt-3 px-3 px-md-4" style={{ fontSize: '12px', marginBottom: '14rem' }}>
        {/* Top Header Card */}
        <Card className="shadow-sm border-0 mb-3 overflow-hidden">
          <div className="bg-burgundy-gradient text-white p-3 p-md-4">
            <Row className="align-items-center g-3">
              <Col xs={12} lg={7}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center bg-white bg-opacity-25 rounded-3 p-3"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <FaBoxesStacked size={30} className="text-white" />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h3 className="mb-0 fw-bold text-white">Stok Greige Harian & Tracking Mutasi</h3>
                      {latestSnapshotAt && (
                        <Badge bg="light" className="text-burgundy fw-bold shadow-sm d-inline-flex align-items-center gap-1">
                          <FiClock size={12} />
                          <span>Snapshot Terakhir: {latestSnapshotAt}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="mb-0 text-white-50 mt-1" style={{ fontSize: '13px' }}>
                      Monitoring Rekapan Harian, Riwayat Masuk Fisik Gudang & Matriks Pergerakan Antar Waktu
                    </p>
                  </div>
                </div>
              </Col>
              <Col xs={12} lg={5} className="d-flex flex-wrap justify-content-lg-end gap-2">
                <Button
                  variant="light"
                  className="fw-semibold text-burgundy shadow-sm px-3 py-2 d-flex align-items-center gap-2"
                  onClick={() => setShowSnapshotModal(true)}
                >
                  <FiCamera size={16} />
                  <span>Ambil Snapshot Stok</span>
                </Button>
                <Button
                  variant="outline-light"
                  className="fw-semibold shadow-sm px-3 py-2 d-flex align-items-center gap-2"
                  onClick={activeTab === 'matrix' ? handleExportMatrixExcel : handleExportAllExcel}
                  disabled={isExportLoading}
                >
                  {isExportLoading ? <Spinner size="sm" animation="border" /> : <RiFileExcel2Fill size={16} />}
                  <span>Export {activeTab === 'matrix' ? 'Matriks' : 'Excel'}</span>
                </Button>
                <Button
                  variant="outline-light"
                  className="shadow-sm p-2"
                  title="Refresh Data"
                  onClick={() => {
                    if (activeTab === 'list') fetchListData(pagination.currentPage, true);
                    else if (activeTab === 'incoming') fetchIncomingSummary();
                    else fetchMatrixData();
                  }}
                >
                  <FiRefreshCw size={16} />
                </Button>
              </Col>
            </Row>

            {/* Navigation Tabs */}
            <div className="mt-3 pt-2 border-top border-white border-opacity-25">
              <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="gap-2">
                <Nav.Item>
                  <Nav.Link
                    eventKey="list"
                    className={`fw-semibold px-3 py-2 ${
                      activeTab === 'list' ? 'bg-white text-burgundy shadow-sm' : 'text-white bg-white bg-opacity-10'
                    }`}
                    style={{ cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FiList size={16} />
                      Daftar Stok & Filter Mutasi
                      {summary && summary.total_motif_masuk > 0 && (
                        <Badge bg="success" className="ms-1" style={{ fontSize: '10px' }}>
                          +{summary.total_motif_masuk} Masuk
                        </Badge>
                      )}
                    </span>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="incoming"
                    className={`fw-semibold px-3 py-2 ${
                      activeTab === 'incoming' ? 'bg-white text-burgundy shadow-sm' : 'text-white bg-white bg-opacity-10'
                    }`}
                    style={{ cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FaTruckFast size={16} />
                      Riwayat Penerimaan Fisik
                      {warehouseEntryDates.length > 0 && (
                        <Badge bg="light" className="text-dark ms-1" style={{ fontSize: '10px' }}>
                          {warehouseEntryDates.length} Hari
                        </Badge>
                      )}
                    </span>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    eventKey="matrix"
                    className={`fw-semibold px-3 py-2 ${
                      activeTab === 'matrix' ? 'bg-white text-burgundy shadow-sm' : 'text-white bg-white bg-opacity-10'
                    }`}
                    style={{ cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FiGrid size={16} />
                      Tabel Matriks / Pivot Tren
                    </span>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
          </div>
        </Card>

        {/* Feedback Alert */}
        {alertInfo && (
          <Alert
            variant={alertInfo.type}
            dismissible
            onClose={() => setAlertInfo(null)}
            className="shadow-sm border-0 d-flex align-items-center justify-content-between py-2"
          >
            <div>{alertInfo.message}</div>
          </Alert>
        )}

        {/* ============================================================== */}
        {/* ======================= TAB 1: LIST VIEW ===================== */}
        {/* ============================================================== */}
        {activeTab === 'list' && (
          <>
            {/* Filter Section */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-light bg-opacity-75 py-2 px-3 fw-bold d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2 text-dark">
                  <FiFilter size={15} />
                  <span>Filter & Parameter Mutasi</span>
                </div>

                {/* Warehouse entry dates badge chips */}
                {warehouseEntryDates.length > 0 && (
                  <div className="d-flex align-items-center gap-1 text-muted flex-wrap" style={{ fontSize: '11px' }}>
                    <FaTruckFast size={13} className="text-success" />
                    <span className="fw-semibold text-dark">Ada Masuk Fisik:</span>
                    <div className="d-flex gap-1 flex-wrap">
                      {warehouseEntryDates.slice(0, 4).map((entry) => (
                        <Badge
                          key={entry.date}
                          bg={filterDate === entry.date && filterDateMode === 'single' ? 'success' : 'light'}
                          className={filterDate === entry.date && filterDateMode === 'single' ? 'text-white' : 'text-dark border'}
                          style={{ cursor: 'pointer' }}
                          title={`Total Masuk: ${formatNumber(entry.total_panjang)} m (${entry.total_roll} Roll)`}
                          onClick={() => {
                            setFilterDateMode('single');
                            setFilterDate(entry.date);
                          }}
                        >
                          {moment(entry.date).format('DD MMM')} ({entry.total_roll} roll)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Header>
              <Card.Body className="p-3">
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchListData(1);
                  }}
                >
                  <Row className="g-2 align-items-end">
                    {/* Date Mode Selector */}
                    <Col xs={12} md={3} lg={2}>
                      <Form.Group controlId="filterDateMode">
                        <Form.Label className="fw-semibold text-muted">Mode Tanggal</Form.Label>
                        <Form.Select
                          size="sm"
                          value={filterDateMode}
                          onChange={(e) => setFilterDateMode(e.target.value)}
                        >
                          <option value="single">Per Tanggal</option>
                          <option value="month">Per Bulan</option>
                          <option value="range">Rentang Tanggal</option>
                          <option value="all">Semua Tanggal</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {/* Date Inputs */}
                    {filterDateMode === 'single' ? (
                      <Col xs={12} md={4} lg={2}>
                        <Form.Group controlId="filterSingleDate">
                          <Form.Label className="fw-semibold text-muted">Tanggal Snapshot</Form.Label>
                          <Form.Control
                            size="sm"
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                          />
                        </Form.Group>
                      </Col>
                    ) : filterDateMode === 'month' ? (
                      <Col xs={12} md={5} lg={3}>
                        <Form.Group controlId="filterMonth">
                          <Form.Label className="fw-semibold text-muted">Bulan Snapshot</Form.Label>
                          <div className="d-flex gap-1">
                            <Form.Select
                              size="sm"
                              value={moment(filterMonth, 'YYYY-MM').isValid() ? moment(filterMonth, 'YYYY-MM').format('MM') : '10'}
                              onChange={(e) => {
                                const currentYearStr = moment(filterMonth, 'YYYY-MM').isValid()
                                  ? moment(filterMonth, 'YYYY-MM').format('YYYY')
                                  : moment().format('YYYY');
                                setFilterMonth(`${currentYearStr}-${e.target.value}`);
                              }}
                              className="fw-semibold"
                            >
                              <option value="01">Januari</option>
                              <option value="02">Februari</option>
                              <option value="03">Maret</option>
                              <option value="04">April</option>
                              <option value="05">Mei</option>
                              <option value="06">Juni</option>
                              <option value="07">Juli</option>
                              <option value="08">Agustus</option>
                              <option value="09">September</option>
                              <option value="10">Oktober</option>
                              <option value="11">November</option>
                              <option value="12">Desember</option>
                            </Form.Select>
                            <Form.Select
                              size="sm"
                              style={{ width: '95px' }}
                              value={moment(filterMonth, 'YYYY-MM').isValid() ? moment(filterMonth, 'YYYY-MM').format('YYYY') : moment().format('YYYY')}
                              onChange={(e) => {
                                const currentMonthStr = moment(filterMonth, 'YYYY-MM').isValid()
                                  ? moment(filterMonth, 'YYYY-MM').format('MM')
                                  : moment().format('MM');
                                setFilterMonth(`${e.target.value}-${currentMonthStr}`);
                              }}
                              className="fw-semibold"
                            >
                              {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </Form.Select>
                          </div>
                        </Form.Group>
                      </Col>
                    ) : filterDateMode === 'range' ? (
                      <>
                        <Col xs={6} md={3} lg={2}>
                          <Form.Group controlId="filterStartDate">
                            <Form.Label className="fw-semibold text-muted">Mulai</Form.Label>
                            <Form.Control
                              size="sm"
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => setFilterStartDate(e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col xs={6} md={3} lg={2}>
                          <Form.Group controlId="filterEndDate">
                            <Form.Label className="fw-semibold text-muted">Sampai</Form.Label>
                            <Form.Control
                              size="sm"
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                      </>
                    ) : (
                      <Col xs={12} md={4} lg={2} className="pb-1">
                        <span className="text-muted fst-italic">Semua Snapshot</span>
                      </Col>
                    )}

                    {/* Motif Filter */}
                    <Col xs={12} md={4} lg={2}>
                      <Form.Group controlId="filterMotif">
                        <Form.Label className="fw-semibold text-muted">Motif / Nama Kain</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Cari motif kain..."
                          value={filterMotif}
                          onChange={(e) => setFilterMotif(e.target.value)}
                        />
                      </Form.Group>
                    </Col>

                    {/* Asal Greige Filter */}
                    <Col xs={12} md={4} lg={2}>
                      <Form.Group controlId="filterAsalGreige">
                        <Form.Label className="fw-semibold text-muted">Asal Greige</Form.Label>
                        <Form.Select
                          size="sm"
                          value={filterAsalGreige}
                          onChange={(e) => setFilterAsalGreige(e.target.value)}
                        >
                          <option value="">Semua Asal</option>
                          {Object.entries(asalGreigeOptions).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {/* Toggle: Only Incoming Switch */}
                    <Col xs={12} md={4} lg={2} className="pb-1">
                      <div className="bg-light p-2 rounded-2 border">
                        <Form.Check
                          type="switch"
                          id="onlyIncomingSwitch"
                          label={
                            <span className="fw-bold text-success d-inline-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                              <FiArrowUp size={13} />
                              Hanya Stok Masuk
                            </span>
                          }
                          checked={onlyIncoming}
                          onChange={(e) => {
                            setOnlyIncoming(e.target.checked);
                            // fetch immediately with new toggle
                            setTimeout(() => fetchListData(1), 50);
                          }}
                        />
                      </div>
                    </Col>

                    {/* Search & Reset Buttons */}
                    <Col xs={12} md={4} lg={2} className="d-flex gap-2">
                      <Button
                        type="submit"
                        variant="burgundy"
                        size="sm"
                        className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                        disabled={isListLoading}
                      >
                        {isListLoading ? <Spinner size="sm" animation="border" /> : <FiSearch size={14} />}
                        <span>Cari</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        size="sm"
                        title="Reset Filter"
                        onClick={() => {
                          setFilterDateMode('single');
                          setFilterDate(availableDates[0] || moment().format('YYYY-MM-DD'));
                          setFilterMonth(moment().format('YYYY-MM'));
                          setFilterStartDate(moment().subtract(7, 'days').format('YYYY-MM-DD'));
                          setFilterEndDate(moment().format('YYYY-MM-DD'));
                          setFilterMotif('');
                          setFilterAsalGreige('');
                          setOnlyIncoming(false);
                        }}
                      >
                        Reset
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            {/* List Table Card */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-0 fw-bold text-dark">Daftar Stok & Analisis Mutasi Harian</h6>
                    {onlyIncoming && (
                      <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                        <FiCheckCircle size={11} /> Filter: Hanya Stok Masuk
                      </Badge>
                    )}
                  </div>
                  <small className="text-muted">
                    {pagination.total > 0
                      ? `Menampilkan ${listData.length} dari ${pagination.total} rekaman stok`
                      : 'Memuat data...'}
                  </small>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Form.Select
                    size="sm"
                    style={{ width: '130px' }}
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setTimeout(() => fetchListData(1), 50);
                    }}
                  >
                    <option value={10}>10 per hal</option>
                    <option value={20}>20 per hal</option>
                    <option value={50}>50 per hal</option>
                    <option value={100}>100 per hal</option>
                  </Form.Select>
                </div>
              </Card.Header>

              <Card.Body className="p-3">
                <div className="p-3 border mt-2 bg-white">
                  <h4 className="text-center py-4">
                    REKAP LAPORAN STOK GREIGE HARIAN
                    {filterDateMode === 'single' && filterDate && (
                      <div className="h6 text-muted mt-1 fw-bold">
                        PER TANGGAL: {moment(filterDate).format('DD MMMM YYYY')}
                      </div>
                    )}
                    {filterDateMode === 'month' && filterMonth && (
                      <div className="h6 text-muted mt-1 fw-bold">
                        PER BULAN: {moment(filterMonth, 'YYYY-MM').format('MMMM YYYY').toUpperCase()}
                      </div>
                    )}
                    {filterDateMode === 'range' && filterStartDate && filterEndDate && (
                      <div className="h6 text-muted mt-1 fw-bold">
                        PERIODE: {moment(filterStartDate).format('DD MMMM YYYY')} s/d {moment(filterEndDate).format('DD MMMM YYYY')}
                      </div>
                    )}
                    <p className="h6 mt-1">PT. GAJAH ANGKASA PERKASA</p>
                  </h4>
                  <Table bordered responsive={true} hover style={{ borderColor: 'black', fontSize: '11px' }}>
                    <tbody className="text-center">
                      <tr>
                        <th rowSpan={2} style={{ borderColor: 'black', verticalAlign: 'middle' }}>No</th>
                        <th rowSpan={2} style={{ borderColor: 'black', verticalAlign: 'middle' }}>Tanggal</th>
                        <th rowSpan={2} style={{ borderColor: 'black', verticalAlign: 'middle' }}>Motif</th>
                        <th rowSpan={2} style={{ borderColor: 'black', verticalAlign: 'middle' }}>Asal Greige</th>
                        <th colSpan={2} style={{ borderColor: 'black' }}>
                          <div>Stok Kemarin</div>
                          <small className="text-muted d-block fw-normal" style={{ fontSize: '10px' }}>
                            {filterDateMode === 'single' && filterDate
                              ? `(s/d ${moment(filterDate).subtract(1, 'day').format('DD/MM/YYYY')})`
                              : '(H-1)'}
                          </small>
                        </th>
                        <th colSpan={2} style={{ borderColor: 'black', backgroundColor: '#e8f5e9' }}>
                          <div className="text-success fw-bold">Stock Masuk Hari Ini</div>
                          <small className="text-success d-block fw-bold" style={{ fontSize: '10px' }}>
                            {filterDateMode === 'single' && filterDate
                              ? `(Tgl ${moment(filterDate).format('DD/MM/YYYY')})`
                              : filterDateMode === 'month' && filterMonth
                              ? `(Bulan ${moment(filterMonth, 'YYYY-MM').format('MM/YYYY')})`
                              : (filterDateMode === 'range' && filterStartDate && filterEndDate
                                ? `(${moment(filterStartDate).format('DD/MM')} - ${moment(filterEndDate).format('DD/MM')})`
                                : '(Masuk Hari Ini)')}
                          </small>
                        </th>
                        <th colSpan={2} style={{ borderColor: 'black' }}>Perubahan (+/-)</th>
                        <th colSpan={2} style={{ borderColor: 'black' }}>
                          <div className="fw-bold text-dark">Jumlah Stock</div>
                          <small className="text-secondary d-block fw-semibold" style={{ fontSize: '10px' }}>
                            {filterDateMode === 'single' && filterDate
                              ? `(Per ${moment(filterDate).format('DD/MM/YYYY')})`
                              : filterDateMode === 'month' && filterMonth
                              ? `(Bulan ${moment(filterMonth, 'YYYY-MM').format('MM/YYYY')})`
                              : '(Kumulatif)'}
                          </small>
                        </th>
                        <th colSpan={6} style={{ borderColor: 'black' }}>Saldo Akhir</th>
                        <th rowSpan={2} style={{ borderColor: 'black', verticalAlign: 'middle', width: '70px' }}>Aksi</th>
                      </tr>
                      <tr>
                        <th style={{ borderColor: 'black' }}>Meter</th>
                        <th style={{ borderColor: 'black' }}>Roll</th>
                        <th style={{ borderColor: 'black', backgroundColor: '#e8f5e9' }}>Meter</th>
                        <th style={{ borderColor: 'black', backgroundColor: '#e8f5e9' }}>Roll</th>
                        <th style={{ borderColor: 'black' }}>Meter</th>
                        <th style={{ borderColor: 'black' }}>Roll</th>
                        <th style={{ borderColor: 'black' }}>Meter</th>
                        <th style={{ borderColor: 'black' }}>Roll</th>
                        <th style={{ borderColor: 'black' }}>A</th>
                        <th style={{ borderColor: 'black' }}>B</th>
                        <th style={{ borderColor: 'black' }}>C</th>
                        <th style={{ borderColor: 'black' }}>D</th>
                        <th style={{ borderColor: 'black' }}>X</th>
                        <th style={{ borderColor: 'black' }}>Total</th>
                      </tr>
                    </tbody>
                    <tbody>
                      {isListLoading ? (
                        <tr>
                          <td colSpan={19} className="text-center py-5">
                            <Spinner animation="border" variant="burgundy" />
                            <div className="mt-2 text-muted fw-semibold">Sedang menyinkronkan & memuat snapshot stok terbaru...</div>
                          </td>
                        </tr>
                      ) : listData.length === 0 ? (
                        <tr>
                          <td colSpan={19} className="text-center py-5 text-muted">
                            <FaBoxesStacked size={36} className="text-muted opacity-50 mb-2" />
                            <div className="fw-semibold">
                              {onlyIncoming
                                ? 'Tidak ada rekaman stok masuk (bertambah) pada filter ini.'
                                : 'Tidak ada rekaman stok greige harian ditemukan.'}
                            </div>
                            <div style={{ fontSize: '11px' }}>
                              Coba sesuaikan filter atau matikan toggle "Hanya Stok Masuk".
                            </div>
                          </td>
                        </tr>
                      ) : (
                        listData.map((item, index) => {
                          const dateDisplay = item.formatted_date || (
                            typeof item.date === 'string'
                              ? item.date.substring(0, 10)
                              : moment(item.date).format('YYYY-MM-DD')
                          );
                          const motifName = item.greige_nama_kain || item.greige?.nama_kain || '-';
                          const asalName = item.asal_greige_name || asalGreigeOptions[item.asal_greige] || '-';
                          const isMasuk = Boolean(item.is_stock_masuk);
                          const diffPanjang = Number(item.diff_panjang || 0);
                          const diffRoll = Number(item.diff_roll || 0);

                          const todayStockM = Number(
                            item.stock_hari_ini_m !== undefined && item.stock_hari_ini_m !== null
                              ? item.stock_hari_ini_m
                              : (diffPanjang > 0 ? diffPanjang : 0)
                          );
                          const todayStockRoll = Number(
                            item.stock_hari_ini_roll !== undefined && item.stock_hari_ini_roll !== null
                              ? item.stock_hari_ini_roll
                              : (diffRoll > 0 ? diffRoll : 0)
                          );

                          const prevStockM =
                            item.prev_total_panjang !== null && item.prev_total_panjang !== undefined
                              ? Number(item.prev_total_panjang)
                              : Math.max(0, Number(item.total_panjang || 0) - todayStockM);
                          const prevStockRoll =
                            item.prev_total_roll !== null && item.prev_total_roll !== undefined
                              ? Number(item.prev_total_roll)
                              : Math.max(0, Number(item.total_roll || 0) - todayStockRoll);

                          return (
                            <tr key={item.id || index} className={isMasuk ? 'table-success bg-opacity-25' : ''}>
                              <td className="text-center py-0" style={{ borderColor: 'black' }}>
                                {(pagination.currentPage - 1) * pagination.perPage + index + 1}
                              </td>

                              {/* Tanggal & Hari */}
                              <td className="text-center py-0" style={{ borderColor: 'black' }}>
                                <div>{dateDisplay}</div>
                                {item.day_name && (
                                  <small className="text-muted" style={{ fontSize: '10px' }}>
                                    {item.day_name}
                                  </small>
                                )}
                              </td>

                              {/* Motif Kain */}
                              <td className="text-start py-0" style={{ borderColor: 'black' }}>
                                <div className="fw-bold text-dark d-flex align-items-center gap-1">
                                  <span>{motifName}</span>
                                  {isMasuk && (
                                    <Badge bg="success" style={{ fontSize: '9px' }} className="ms-1">
                                      +Masuk
                                    </Badge>
                                  )}
                                </div>
                                {item.greige?.alias && (
                                  <small className="text-muted fst-italic">({item.greige.alias})</small>
                                )}
                              </td>

                              {/* Asal Greige */}
                              <td className="text-center py-0" style={{ borderColor: 'black' }}>
                                {asalName}
                              </td>

                              {/* Stok Kemarin */}
                              <td className="text-end py-0 text-muted" style={{ borderColor: 'black' }}>
                                {formatNumber(prevStockM)}
                              </td>
                              <td className="text-center py-0 text-muted" style={{ borderColor: 'black' }}>
                                {formatInteger(prevStockRoll)}
                              </td>

                              {/* Stock Masuk Hari Ini */}
                              <td
                                className="text-end py-0 fw-bold"
                                style={{
                                  borderColor: 'black',
                                  backgroundColor: todayStockM > 0 ? '#e8f5e9' : undefined,
                                }}
                              >
                                {todayStockM > 0 ? (
                                  <div>
                                    <span className="text-success">+{formatNumber(todayStockM)}</span>
                                    {item.stock_masuk_jam && (
                                      <small
                                        className="d-block text-success fw-normal"
                                        style={{ fontSize: '9px', lineHeight: '1.1' }}
                                        title={`Jam Input Stok: ${item.stock_masuk_jam}`}
                                      >
                                        Jam: {item.stock_masuk_jam}
                                      </small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">0,00</span>
                                )}
                              </td>
                              <td
                                className="text-center py-0 fw-bold"
                                style={{
                                  borderColor: 'black',
                                  backgroundColor: todayStockRoll > 0 ? '#e8f5e9' : undefined,
                                }}
                              >
                                {todayStockRoll > 0 ? (
                                  <div>
                                    <span className="text-success">+{formatInteger(todayStockRoll)}</span>
                                    {item.stock_masuk_jam && (
                                      <small
                                        className="d-block text-success fw-normal"
                                        style={{ fontSize: '9px', lineHeight: '1.1' }}
                                      >
                                        {item.stock_masuk_jam}
                                      </small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">0</span>
                                )}
                              </td>

                              {/* Perubahan (+/-) */}
                              <td className="text-end py-0 fw-bold" style={{ borderColor: 'black' }}>
                                {diffPanjang > 0 ? (
                                  <span className="text-success">+{formatNumber(diffPanjang)}</span>
                                ) : diffPanjang < 0 ? (
                                  <span className="text-danger">{formatNumber(diffPanjang)}</span>
                                ) : (
                                  <span className="text-muted">0,00</span>
                                )}
                              </td>
                              <td className="text-center py-0 fw-bold" style={{ borderColor: 'black' }}>
                                {diffRoll > 0 ? (
                                  <span className="text-success">+{formatInteger(diffRoll)}</span>
                                ) : diffRoll < 0 ? (
                                  <span className="text-danger">{formatInteger(diffRoll)}</span>
                                ) : (
                                  <span className="text-muted">0</span>
                                )}
                              </td>

                              {/* Jumlah Stock (Hari Ini) */}
                              <td className="text-end py-0 fw-bold text-dark" style={{ borderColor: 'black', fontSize: '12px' }}>
                                {formatNumber(item.total_panjang)}
                              </td>
                              <td className="text-center py-0 fw-bold" style={{ borderColor: 'black' }}>
                                {formatInteger(item.total_roll)}
                              </td>

                              {/* Saldo Akhir */}
                              <td className="text-end py-0" style={{ borderColor: 'black' }}>
                                {formatNumber(item.grade_a)}
                              </td>
                              <td className="text-end py-0" style={{ borderColor: 'black' }}>
                                {formatNumber(item.grade_b)}
                              </td>
                              <td className="text-end py-0" style={{ borderColor: 'black' }}>
                                {formatNumber(item.grade_c)}
                              </td>
                              <td className="text-end py-0" style={{ borderColor: 'black' }}>
                                {formatNumber(item.grade_d)}
                              </td>
                              <td className="text-end py-0 text-danger" style={{ borderColor: 'black' }}>
                                {formatNumber(item.grade_ng)}
                              </td>
                              <td className="text-end py-0 fw-bold" style={{ borderColor: 'black' }}>
                                {formatNumber(item.total_panjang)}
                              </td>

                              {/* Aksi */}
                              <td className="text-center py-0" style={{ borderColor: 'black' }}>
                                <Stack direction="horizontal" gap={1} className="justify-content-center">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="p-1"
                                    title="Lihat Detail"
                                    onClick={() => handleViewDetail(item.id)}
                                  >
                                    <FiEye size={12} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="p-1"
                                    title="Hapus Rekaman"
                                    onClick={() => handleOpenDelete(item)}
                                  >
                                    <FiTrash2 size={12} />
                                  </Button>
                                </Stack>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {listData.length > 0 && (
                      <tfoot>
                        <tr className="fw-bold" style={{ borderColor: 'black' }}>
                          <td colSpan={4} className="text-center py-1 fw-bold" style={{ borderColor: 'black' }}>
                            TOTAL
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(
                              listData.reduce((t, d) => {
                                const todayM = Number(d.stock_hari_ini_m !== undefined ? d.stock_hari_ini_m : (d.diff_panjang > 0 ? d.diff_panjang : 0));
                                const prevM = d.prev_total_panjang !== null && d.prev_total_panjang !== undefined
                                  ? Number(d.prev_total_panjang)
                                  : Math.max(0, Number(d.total_panjang || 0) - todayM);
                                return t + prevM;
                              }, 0)
                            )}
                          </td>
                          <td className="text-center py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatInteger(
                              listData.reduce((t, d) => {
                                const todayR = Number(d.stock_hari_ini_roll !== undefined ? d.stock_hari_ini_roll : (d.diff_roll > 0 ? d.diff_roll : 0));
                                const prevR = d.prev_total_roll !== null && d.prev_total_roll !== undefined
                                  ? Number(d.prev_total_roll)
                                  : Math.max(0, Number(d.total_roll || 0) - todayR);
                                return t + prevR;
                              }, 0)
                            )}
                          </td>
                          <td className="text-end py-1 fw-bold text-success" style={{ borderColor: 'black', backgroundColor: '#e8f5e9' }}>
                            {formatNumber(
                              listData.reduce((t, d) => {
                                const todayM = Number(d.stock_hari_ini_m !== undefined ? d.stock_hari_ini_m : (d.diff_panjang > 0 ? d.diff_panjang : 0));
                                return t + todayM;
                              }, 0)
                            )}
                          </td>
                          <td className="text-center py-1 fw-bold text-success" style={{ borderColor: 'black', backgroundColor: '#e8f5e9' }}>
                            {formatInteger(
                              listData.reduce((t, d) => {
                                const todayR = Number(d.stock_hari_ini_roll !== undefined ? d.stock_hari_ini_roll : (d.diff_roll > 0 ? d.diff_roll : 0));
                                return t + todayR;
                              }, 0)
                            )}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.diff_panjang || 0), 0))}
                          </td>
                          <td className="text-center py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatInteger(listData.reduce((t, d) => t + Number(d.diff_roll || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black', fontSize: '13px' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.total_panjang || 0), 0))}
                          </td>
                          <td className="text-center py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatInteger(listData.reduce((t, d) => t + Number(d.total_roll || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.grade_a || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.grade_b || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.grade_c || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.grade_d || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold text-danger" style={{ borderColor: 'black' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.grade_ng || 0), 0))}
                          </td>
                          <td className="text-end py-1 fw-bold" style={{ borderColor: 'black', fontSize: '13px' }}>
                            {formatNumber(listData.reduce((t, d) => t + Number(d.total_panjang || 0), 0))}
                          </td>
                          <td style={{ borderColor: 'black' }}></td>
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                </div>
              </Card.Body>

              {/* Pagination Controls */}
              {pagination.lastPage > 1 && (
                <Card.Footer className="bg-white py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2 border-top">
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    Menampilkan data baris{' '}
                    <strong>{(pagination.currentPage - 1) * pagination.perPage + 1}</strong> -{' '}
                    <strong>{Math.min(pagination.currentPage * pagination.perPage, pagination.total)}</strong>{' '}
                    dari total <strong>{pagination.total}</strong> item (Halaman {pagination.currentPage} dari {pagination.lastPage})
                  </div>
                  <Pagination size="sm" className="mb-0 flex-wrap">
                    <Pagination.First
                      disabled={pagination.currentPage <= 1 || isListLoading}
                      onClick={() => fetchListData(1)}
                      title="Halaman Pertama"
                    />
                    <Pagination.Prev
                      disabled={pagination.currentPage <= 1 || isListLoading}
                      onClick={() => fetchListData(pagination.currentPage - 1)}
                      title="Halaman Sebelumnya"
                    />
                    {renderPaginationItems()}
                    <Pagination.Next
                      disabled={pagination.currentPage >= pagination.lastPage || isListLoading}
                      onClick={() => fetchListData(pagination.currentPage + 1)}
                      title="Halaman Berikutnya"
                    />
                    <Pagination.Last
                      disabled={pagination.currentPage >= pagination.lastPage || isListLoading}
                      onClick={() => fetchListData(pagination.lastPage)}
                      title="Halaman Terakhir"
                    />
                  </Pagination>
                </Card.Footer>
              )}
            </Card>
          </>
        )}

        {/* ============================================================== */}
        {/* ================= TAB 2: INCOMING SUMMARY WIDGET ============= */}
        {/* ============================================================== */}
        {activeTab === 'incoming' && (
          <>
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-light py-3 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaTruckFast size={18} className="text-success" />
                    <span>Riwayat Penerimaan Stok Fisik Masuk Gudang Per Tanggal</span>
                  </h6>
                  <small className="text-muted">
                    Rekapan riil kedatangan roll kain greige baru di gudang beserta waktu pencatatan terakhir oleh operator.
                  </small>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                  onClick={fetchIncomingSummary}
                  disabled={isIncomingLoading}
                >
                  <FiRefreshCw size={13} />
                  <span>Refresh</span>
                </Button>
              </Card.Header>

              <Card.Body className="p-3">
                {isIncomingLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="burgundy" />
                    <div className="mt-2 text-muted fw-semibold">Memuat riwayat penerimaan stok fisik...</div>
                  </div>
                ) : incomingSummaryList.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <FiInbox size={36} className="text-muted opacity-50 mb-2" />
                    <div className="fw-semibold">Belum ada riwayat penerimaan stok fisik yang tercatat.</div>
                  </div>
                ) : (
                  <Row className="g-3">
                    {incomingSummaryList.map((entry, idx) => (
                      <Col key={entry.date || idx} xs={12} md={6} lg={4}>
                        <Card className="border shadow-sm h-100 hover-card p-3 bg-white rounded-3 border-top border-4 border-success">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <Badge bg="success" className="px-2 py-1 mb-1">
                                {moment(entry.date).format('dddd, DD MMMM YYYY')}
                              </Badge>
                              <div className="text-muted" style={{ fontSize: '11px' }}>
                                Tanggal Penerimaan
                              </div>
                            </div>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="py-1 px-2 d-flex align-items-center gap-1"
                              style={{ fontSize: '11px' }}
                              onClick={() => {
                                setFilterDateMode('single');
                                setFilterDate(entry.date);
                                setOnlyIncoming(true);
                                setActiveTab('list');
                                setTimeout(() => fetchListData(1), 50);
                              }}
                            >
                              <span>Lihat Detail</span>
                              <FiArrowUpRight size={13} />
                            </Button>
                          </div>

                          <Row className="g-2 my-2 text-center">
                            <Col xs={4}>
                              <div className="bg-light p-2 rounded-2">
                                <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                                  TOTAL ROLL
                                </small>
                                <strong className="text-success fs-6">+{formatInteger(entry.total_roll)}</strong>
                              </div>
                            </Col>
                            <Col xs={4}>
                              <div className="bg-light p-2 rounded-2">
                                <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                                  PANJANG
                                </small>
                                <strong className="text-primary fs-6">+{formatNumber(entry.total_panjang, 0)} m</strong>
                              </div>
                            </Col>
                            <Col xs={4}>
                              <div className="bg-light p-2 rounded-2">
                                <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                                  MOTIF
                                </small>
                                <strong className="text-dark fs-6">{entry.total_motif || '-'}</strong>
                              </div>
                            </Col>
                          </Row>

                          {entry.latest_input_time && (
                            <div className="mt-2 pt-2 border-top d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '11px' }}>
                              <span className="d-inline-flex align-items-center gap-1">
                                <FiClock size={12} className="text-secondary" />
                                <span>Inputan Terakhir Operator:</span>
                              </span>
                              <strong className="text-dark">{entry.latest_input_time}</strong>
                            </div>
                          )}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card.Body>
            </Card>
          </>
        )}

        {/* ============================================================== */}
        {/* ======================= TAB 3: MATRIX VIEW =================== */}
        {/* ============================================================== */}
        {activeTab === 'matrix' && (
          <>
            {/* Filter Matrix */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-light py-2 px-3 fw-bold d-flex align-items-center gap-2">
                <FiGrid size={15} />
                <span>Filter Matriks Pergerakan Stok Antar Tanggal</span>
              </Card.Header>
              <Card.Body className="p-3">
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchMatrixData();
                  }}
                >
                  <Row className="g-2">
                    <Col xs={12} sm={6} md={3} lg={2}>
                      <Form.Group controlId="matrixStartDate">
                        <Form.Label className="fw-semibold text-muted">Tanggal Awal</Form.Label>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={matrixStartDate}
                          onChange={(e) => setMatrixStartDate(e.target.value)}
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} sm={6} md={3} lg={2}>
                      <Form.Group controlId="matrixEndDate">
                        <Form.Label className="fw-semibold text-muted">Tanggal Akhir</Form.Label>
                        <Form.Control
                          size="sm"
                          type="date"
                          value={matrixEndDate}
                          onChange={(e) => setMatrixEndDate(e.target.value)}
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={3} lg={3}>
                      <Form.Group controlId="matrixMotif">
                        <Form.Label className="fw-semibold text-muted">Motif Kain</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Filter nama motif..."
                          value={matrixMotif}
                          onChange={(e) => setMatrixMotif(e.target.value)}
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={3} lg={2}>
                      <Form.Group controlId="matrixAsalGreige">
                        <Form.Label className="fw-semibold text-muted">Asal Greige</Form.Label>
                        <Form.Select
                          size="sm"
                          value={matrixAsalGreige}
                          onChange={(e) => setMatrixAsalGreige(e.target.value)}
                        >
                          <option value="">Semua Asal</option>
                          {Object.entries(asalGreigeOptions).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col xs={12} lg={3} className="d-flex align-items-end gap-2">
                      <Button
                        type="submit"
                        variant="burgundy"
                        size="sm"
                        className="fw-semibold d-flex align-items-center gap-1 flex-grow-1 justify-content-center"
                        disabled={isMatrixLoading}
                      >
                        {isMatrixLoading ? <Spinner size="sm" animation="border" /> : <FiSearch size={14} />}
                        <span>Muat Matriks</span>
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        className="fw-semibold d-flex align-items-center gap-1"
                        onClick={handleExportMatrixExcel}
                        title="Export ke Excel"
                      >
                        <RiFileExcel2Fill size={15} />
                        <span>Export</span>
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            {/* Matrix Pivot Table */}
            <Card className="shadow-sm border-0 mb-3">
              <Card.Header className="bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h6 className="mb-0 fw-bold text-dark">Matriks Silang Stok Greige (Motif vs Tanggal)</h6>
                  <small className="text-muted">
                    Menampilkan total panjang meter, roll, dan selisih perkembangan stok per hari.
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {/* Navigasi Geser Tabel */}
                  <div className="d-flex align-items-center bg-light border rounded px-2 py-1 gap-1 shadow-sm">
                    <span className="text-muted fw-semibold me-1 d-none d-sm-inline" style={{ fontSize: '11px' }}>
                      <FiMove size={12} className="me-1 text-primary" />
                      Geser Kolom:
                    </span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0 px-2 fw-semibold"
                      style={{ fontSize: '11px', height: '26px' }}
                      title="Geser ke Tanggal Paling Awal"
                      onClick={() => scrollMatrixToEdge('start')}
                    >
                      <FiChevronsLeft size={13} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0 px-2 fw-semibold"
                      style={{ fontSize: '11px', height: '26px' }}
                      title="Geser Kiri"
                      onClick={() => scrollMatrix('left')}
                    >
                      <FiChevronLeft size={13} /> Kiri
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0 px-2 fw-semibold"
                      style={{ fontSize: '11px', height: '26px' }}
                      title="Geser Kanan"
                      onClick={() => scrollMatrix('right')}
                    >
                      Kanan <FiChevronRight size={13} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="py-0 px-2 fw-semibold"
                      style={{ fontSize: '11px', height: '26px' }}
                      title="Geser ke Tanggal Paling Akhir"
                      onClick={() => scrollMatrixToEdge('end')}
                    >
                      <FiChevronsRight size={13} />
                    </Button>
                  </div>

                  <Badge bg="light" className="text-dark border py-2 px-2">
                    <FiCalendar className="me-1" />
                    {matrixDates.length} Tanggal Snapshot
                  </Badge>
                  <Badge bg="light" className="text-dark border py-2 px-2">
                    <FiLayers className="me-1" />
                    {displayedMatrixMotifs.length} Motif/Asal
                  </Badge>
                </div>
              </Card.Header>

              {/* Tips Banner */}
              <div className="bg-light px-3 py-1 border-bottom d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '11px' }}>
                <div className="d-flex align-items-center gap-1">
                  <FiMove size={12} className="text-primary" />
                  <span>
                    <strong>Tips:</strong> Klik & tahan mouse lalu seret (drag) pada tabel untuk menggeser ke kiri/kanan, atau gunakan tombol <strong>Geser Kolom</strong> di kanan atas.
                  </span>
                </div>
                <div className="d-none d-md-block text-secondary">
                  Kolom No & Motif tetap terkunci di kiri saat digeser.
                </div>
              </div>

              <Card.Body className="p-0">
                <div
                  ref={matrixScrollRef}
                  className="table-responsive"
                  style={{
                    maxHeight: '650px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    cursor: 'grab',
                    willChange: 'scroll-position',
                  }}
                  onMouseDown={handleMatrixMouseDown}
                  onMouseMove={handleMatrixMouseMove}
                >
                  <Table bordered hover className="mb-0 text-nowrap" style={{ fontSize: '11px' }}>
                    <thead
                      className="table-light text-center border-bottom border-dark border-opacity-10 position-sticky top-0"
                      style={{ zIndex: 5 }}
                    >
                      <tr>
                        <th
                          rowSpan={2}
                          className="align-middle bg-light position-sticky start-0"
                          style={{ zIndex: 6, width: '40px', borderRight: '1px solid #ced4da' }}
                        >
                          No
                        </th>
                        <th
                          rowSpan={2}
                          className="align-middle text-start bg-light position-sticky"
                          style={{
                            left: '40px',
                            zIndex: 6,
                            minWidth: '220px',
                            boxShadow: '3px 0 5px -2px rgba(0,0,0,0.12)',
                            borderRight: '2px solid #adb5bd',
                          }}
                        >
                          Motif / Nama Kain
                        </th>
                        <th rowSpan={2} className="align-middle bg-light" style={{ minWidth: '110px' }}>
                          Asal Greige
                        </th>
                        {matrixDates.map((d) => (
                          <th key={d} colSpan={2} className="table-primary border-start border-end">
                            {moment(d).format('DD MMM YYYY')}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {matrixDates.map((d) => (
                          <React.Fragment key={`${d}_sub`}>
                            <th className="table-primary" style={{ minWidth: '95px' }}>
                              Meter
                            </th>
                            <th className="table-primary" style={{ minWidth: '60px' }}>
                              Roll
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isMatrixLoading ? (
                        <tr>
                          <td colSpan={3 + matrixDates.length * 2} className="text-center py-5">
                            <Spinner animation="border" variant="burgundy" />
                            <div className="mt-2 text-muted fw-semibold">Menghitung matriks stok greige...</div>
                          </td>
                        </tr>
                      ) : displayedMatrixMotifs.length === 0 ? (
                        <tr>
                          <td colSpan={3 + matrixDates.length * 2} className="text-center py-5 text-muted">
                            <FiGrid size={36} className="text-muted opacity-50 mb-2" />
                            <div className="fw-semibold">
                              {matrixMotif.trim()
                                ? `Tidak ada motif "${matrixMotif}" ditemukan pada rentang tanggal ini.`
                                : 'Tidak ada data matriks dalam rentang tanggal ini.'}
                            </div>
                            <small>Coba sesuaikan kata kunci pencarian motif kain atau rentang tanggal.</small>
                          </td>
                        </tr>
                      ) : (
                        displayedMatrixMotifs.map((motif, index) => {
                          return (
                            <tr
                              key={motif.composite_key || index}
                              style={{
                                contentVisibility: 'auto',
                                containIntrinsicSize: '36px',
                              }}
                            >
                              <td
                                className="text-center text-muted position-sticky start-0 bg-white"
                                style={{ zIndex: 2, borderRight: '1px solid #ced4da' }}
                              >
                                {index + 1}
                              </td>
                              <td
                                className="text-start fw-bold text-dark position-sticky bg-white"
                                style={{
                                  left: '40px',
                                  zIndex: 2,
                                  boxShadow: '3px 0 5px -2px rgba(0,0,0,0.12)',
                                  borderRight: '2px solid #adb5bd',
                                }}
                              >
                                {motif.nama || '-'}
                              </td>
                              <td className="text-center">
                                <Badge bg="light" className="text-dark border">
                                  {motif.asal_greige_name || asalGreigeOptions[motif.asal_greige] || '-'}
                                </Badge>
                              </td>

                              {/* Matrix Date Values */}
                              {matrixDates.map((d) => {
                                const cell = matrixData[motif.composite_key] && matrixData[motif.composite_key][d];
                                if (!cell) {
                                  return (
                                    <React.Fragment key={`${motif.composite_key}_${d}`}>
                                      <td className="text-center text-muted opacity-50">-</td>
                                      <td className="text-center text-muted opacity-50">-</td>
                                    </React.Fragment>
                                  );
                                }

                                const diffQty = Number(cell.diff_qty || 0);

                                return (
                                  <React.Fragment key={`${motif.composite_key}_${d}`}>
                                    <td className="text-end">
                                      <div className="fw-semibold text-primary">{formatNumber(cell.qty)}</div>
                                      {diffQty !== 0 && (
                                        <div
                                          style={{ fontSize: '9px' }}
                                          className={`fw-semibold ${
                                            diffQty > 0 ? 'text-success' : 'text-danger'
                                          }`}
                                        >
                                          {diffQty > 0 ? `+${formatNumber(diffQty)}` : formatNumber(diffQty)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center">
                                      <div>{formatInteger(cell.roll)}</div>
                                      {cell.diff_roll !== 0 && (
                                        <div
                                          style={{ fontSize: '9px' }}
                                          className={`fw-semibold ${
                                            cell.diff_roll > 0 ? 'text-success' : 'text-danger'
                                          }`}
                                        >
                                          {cell.diff_roll > 0
                                            ? `+${formatInteger(cell.diff_roll)}`
                                            : formatInteger(cell.diff_roll)}
                                        </div>
                                      )}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </>
        )}
      </Container>

      {/* ============================================================== */}
      {/* ======================= SNAPSHOT MODAL ======================= */}
      {/* ============================================================== */}
      <Modal
        show={showSnapshotModal}
        onHide={() => !isSnapshotLoading && setShowSnapshotModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton={!isSnapshotLoading} className="bg-burgundy-gradient text-white">
          <Modal.Title className="h6 mb-0 d-flex align-items-center gap-2">
            <FiCamera size={18} />
            <span>Simpan Snapshot Stok Greige</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="text-center mb-3">
            <div className="bg-burgundy bg-opacity-10 text-burgundy rounded-circle d-inline-flex p-3 mb-2">
              <FaBoxesStacked size={32} />
            </div>
            <h6 className="fw-bold">Ambil Snapshot Fisik Gudang</h6>
            <p className="text-muted" style={{ fontSize: '12px' }}>
              Fitur ini akan merekap seluruh stok fisik greige yang valid di gudang saat ini dan menyimpannya sebagai
              rekaman stok harian per motif dan asal greige.
            </p>
          </div>

          <Form.Group controlId="snapshotDateInput" className="mb-3">
            <Form.Label className="fw-semibold">Pilih Tanggal Snapshot:</Form.Label>
            <Form.Control
              type="date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              disabled={isSnapshotLoading}
            />
            <Form.Text className="text-muted">
              Default adalah hari ini. Jika sudah ada data di tanggal ini, sistem akan memperbarui nilainya.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowSnapshotModal(false)}
            disabled={isSnapshotLoading}
          >
            Batal
          </Button>
          <Button
            variant="burgundy"
            onClick={handleSaveSnapshot}
            disabled={isSnapshotLoading}
            className="d-flex align-items-center gap-2"
          >
            {isSnapshotLoading ? (
              <>
                <Spinner size="sm" animation="border" />
                <span>Memproses Snapshot...</span>
              </>
            ) : (
              <>
                <FiCamera size={16} />
                <span>Mulai Simpan Snapshot</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* ======================= DETAIL MODAL ========================= */}
      {/* ============================================================== */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-burgundy text-white">
          <Modal.Title className="h6 mb-0 d-flex align-items-center gap-2">
            <FiEye size={18} />
            <span>Detail Rekaman Stok & Mutasi</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ fontSize: '12px' }}>
          {isDetailLoading || !detailItem ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="burgundy" />
              <div className="mt-2 text-muted">Memuat rincian stok...</div>
            </div>
          ) : (
            <div>
              {/* Header Info */}
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <Row className="g-2">
                  <Col sm={6}>
                    <div className="text-muted">Motif Kain:</div>
                    <div className="fw-bold fs-6 text-dark">
                      {detailItem.greige_nama_kain || detailItem.greige?.nama_kain || '-'}
                    </div>
                    {detailItem.greige?.alias && (
                      <small className="text-muted fst-italic">Alias: {detailItem.greige.alias}</small>
                    )}
                  </Col>
                  <Col sm={3}>
                    <div className="text-muted">Group / Lebar:</div>
                    <div className="fw-semibold">
                      {detailItem.greige_group?.nama || detailItem.greige_group?.nama_kain || detailItem.greigeGroup?.nama || '-'}
                    </div>
                    {(detailItem.greige_group?.lebar_kain || detailItem.greigeGroup?.lebar_kain) && (
                      <small className="text-muted">
                        Lebar: {detailItem.greige_group?.lebar_kain || detailItem.greigeGroup?.lebar_kain}"
                      </small>
                    )}
                  </Col>
                  <Col sm={3}>
                    <div className="text-muted">Asal Greige:</div>
                    <Badge bg="burgundy">
                      {detailItem.asal_greige_name || asalGreigeOptions[detailItem.asal_greige] || '-'}
                    </Badge>
                  </Col>
                </Row>
                <hr className="my-2" />
                <Row className="g-2 text-muted" style={{ fontSize: '11px' }}>
                  <Col sm={4}>
                    <div>
                      Tanggal:{' '}
                      <strong className="text-dark">
                        {detailItem.formatted_date || moment(detailItem.date).format('DD MMMM YYYY')}
                      </strong>
                    </div>
                  </Col>
                  <Col sm={4}>
                    <div>
                      Dibuat Oleh:{' '}
                      <strong className="text-dark">
                        {detailItem.createdBy?.full_name || detailItem.createdBy?.username || '-'}
                      </strong>
                    </div>
                  </Col>
                  <Col sm={4}>
                    <div>
                      Waktu Simpan:{' '}
                      <strong className="text-dark">
                        {detailItem.created_at_formatted ||
                          (detailItem.created_at
                            ? moment(
                                typeof detailItem.created_at === 'number'
                                  ? detailItem.created_at * 1000
                                  : detailItem.created_at
                              ).format('DD/MM/YYYY HH:mm')
                            : '-')}
                      </strong>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Stock Overview Cards */}
              <Row className="g-2 mb-3">
                <Col sm={4}>
                  <Card className="text-center p-3 border-0 bg-primary bg-opacity-10">
                    <div className="text-muted fw-semibold">TOTAL PANJANG</div>
                    <h4 className="fw-bold text-primary mb-0">{formatNumber(detailItem.total_panjang)} m</h4>
                  </Card>
                </Col>
                <Col sm={4}>
                  <Card className="text-center p-3 border-0 bg-success bg-opacity-10">
                    <div className="text-muted fw-semibold">TOTAL ROLL</div>
                    <h4 className="fw-bold text-success mb-0">{formatInteger(detailItem.total_roll)} Roll</h4>
                  </Card>
                </Col>
                <Col sm={4}>
                  <Card className="text-center p-3 border-0 bg-warning bg-opacity-10">
                    <div className="text-muted fw-semibold">PERUBAHAN MUTASI</div>
                    <h4
                      className={`fw-bold mb-0 ${
                        Number(detailItem.diff_panjang) > 0
                          ? 'text-success'
                          : Number(detailItem.diff_panjang) < 0
                          ? 'text-danger'
                          : 'text-muted'
                      }`}
                    >
                      {Number(detailItem.diff_panjang) > 0 ? '+' : ''}
                      {formatNumber(detailItem.diff_panjang)} m
                    </h4>
                    <small className="text-muted">
                      ({Number(detailItem.diff_roll) > 0 ? '+' : ''}
                      {formatInteger(detailItem.diff_roll)} Roll)
                    </small>
                  </Card>
                </Col>
              </Row>

              {/* Breakdown Grade Table */}
              <h6 className="fw-bold mb-2">Rincian Komposisi Grade (Meter):</h6>
              <div className="table-responsive">
                <Table bordered hover size="sm" className="text-center mb-0" style={{ fontSize: '11px' }}>
                  <thead className="table-light">
                    <tr>
                      <th className="table-success">Grade A</th>
                      <th className="table-primary">Grade B</th>
                      <th className="table-warning">Grade C</th>
                      <th>Grade D</th>
                      <th>Grade E</th>
                      <th className="table-danger">Grade NG</th>
                      <th>Grade Lain</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-bold text-success">{formatNumber(detailItem.grade_a)}</td>
                      <td className="fw-bold text-primary">{formatNumber(detailItem.grade_b)}</td>
                      <td className="fw-bold text-warning">{formatNumber(detailItem.grade_c)}</td>
                      <td>{formatNumber(detailItem.grade_d)}</td>
                      <td>{formatNumber(detailItem.grade_e)}</td>
                      <td className="fw-bold text-danger">{formatNumber(detailItem.grade_ng)}</td>
                      <td>{formatNumber(detailItem.grade_lain)}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>

              {/* Riwayat Jam Penambahan Input Stock Fisik */}
              <div className="mt-3 pt-3 border-top">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FiClock size={16} className="text-success" />
                    <span>Riwayat Jam Input Masuk Stok (Fisik)</span>
                  </h6>
                  {detailIncomingRolls.length > 0 && (
                    <Badge bg="success" className="px-2 py-1 shadow-sm">
                      +{formatNumber(detailIncomingRolls.reduce((sum, r) => sum + r.panjang_m, 0))} m ({detailIncomingRolls.length} Roll)
                    </Badge>
                  )}
                </div>

                {/* Ringkasan Per Sesi Jam Input */}
                {detailHourlySummary.length > 0 && (
                  <div className="d-flex gap-2 flex-wrap mb-2">
                    {detailHourlySummary.map((hs, i) => (
                      <Badge
                        key={i}
                        bg="light"
                        className="text-dark border p-2 fw-normal d-flex align-items-center gap-1 shadow-sm"
                        style={{ fontSize: '11px' }}
                      >
                        <span className="badge bg-success">{hs.jam}</span>
                        <span>
                          <strong>{formatInteger(hs.total_roll)} Roll</strong> ({formatNumber(hs.total_m)} m)
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tabel Rincian Tiap Roll Masuk & Jam Inputnya */}
                {detailIncomingRolls.length > 0 ? (
                  <div className="table-responsive border rounded-2" style={{ maxHeight: '230px', overflowY: 'auto' }}>
                    <Table bordered hover size="sm" className="text-center mb-0" style={{ fontSize: '11px' }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: '40px' }}>No</th>
                          <th>Jam Input</th>
                          <th>ID Roll</th>
                          <th>Panjang (m)</th>
                          <th>Grade</th>
                          <th>Lot Lusi</th>
                          <th>Lot Pakan</th>
                          <th>Dokumen / Pengirim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailIncomingRolls.map((roll, idx) => (
                          <tr key={roll.id || idx}>
                            <td>{idx + 1}</td>
                            <td className="fw-bold">
                              <Badge bg="success" bg-opacity="10" className="text-success border border-success fw-bold">
                                {roll.time || roll.datetime}
                              </Badge>
                            </td>
                            <td className="fw-semibold">#{roll.id}</td>
                            <td className="fw-bold text-dark">{formatNumber(roll.panjang_m)}</td>
                            <td>
                              <Badge
                                bg={
                                  roll.grade === 1
                                    ? 'success'
                                    : roll.grade === 2
                                    ? 'primary'
                                    : roll.grade === 3
                                    ? 'warning'
                                    : 'secondary'
                                }
                              >
                                Grade {['A', 'B', 'C', 'D', 'E', 'NG', 'Lain'][roll.grade - 1] || roll.grade}
                              </Badge>
                            </td>
                            <td>{roll.lot_lusi}</td>
                            <td>{roll.lot_pakan}</td>
                            <td>{roll.no_document !== '-' ? roll.no_document : roll.pengirim}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-3 bg-light rounded text-center text-muted" style={{ fontSize: '11px' }}>
                    Tidak ada rekaman roll baru yang masuk fisik di gudang pada tanggal ini.
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ============================================================== */}
      {/* ======================= DELETE MODAL ========================= */}
      {/* ============================================================== */}
      <ConfirmModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={
          itemToDelete
            ? `Hapus rekaman stok tanggal ${
                itemToDelete.formatted_date || moment(itemToDelete.date).format('DD/MM/YYYY')
              } untuk motif ${itemToDelete.greige_nama_kain || itemToDelete.greige?.nama_kain || '-'}?`
            : 'Konfirmasi Hapus Data'
        }
      />

      {/* Bottom Menu Navigation */}
      <Bottom />
    </>
  );
};

export default StockGreigeDaily;
