/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../../../shared/contexts";
import * as profileApi from "../services/profileApi";
import { NitroCache } from "../../../shared/utils/NitroCache";

export const useProfile = () => {
  const { user: authUser, logout: onLogout, isAdmin, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });
  const [formData, setFormData] = useState({
    documentType: "", documentNumber: "",
    name: "", email: "", phone: "",
    countryCode: "+57",
    city: "", address: "",
  });
  const [errors, setErrors] = useState({}); // 🟢 Estado para errores de perfil
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredModalData, setExpiredModalData] = useState({ periodDays: 5, expiredDate: '', orderDate: '' });
  const [orderQuery, setOrderQuery] = useState("");
  const [returnQuery, setReturnQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl || "");
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('account'); 
  const [orderView, setOrderView] = useState('list'); 
  const [returnView, setReturnView] = useState('list'); 
  const [isBulkReturn, setIsBulkReturn] = useState(false);
  
  const [orderStatus, setOrderStatus] = useState('Todos');
  const [returnStatus, setReturnStatus] = useState('Todos');
  
  const [returnFormData, setReturnFormData] = useState({
    replacementProductId: "",
    mismoModelo: false,
    evidence: null,
    reason: "",
    cantidad: 1,
    items: []
  });
  const [returnErrors, setReturnErrors] = useState({});
  const [showReturnForm, setShowReturnForm] = useState(false);
  
  const [ordersPage, setOrdersPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, title: "", message: "", onConfirm: null, confirmText: "CONFIRMAR", isDanger: false 
  });
  const [initialProducts, setInitialProducts] = useState([]);

  // Load products (Only when needed for returns)
  useEffect(() => {
    if (activeTab === 'returns' && initialProducts.length === 0) {
      const fetchProds = async () => {
        const prods = await profileApi.getProducts();
        setInitialProducts(prods);
      };
      fetchProds();
    }
  }, [activeTab, initialProducts.length]);

  // Sync returnFormData.items size with returnFormData.cantidad
  useEffect(() => {
    if (selectedProduct && !isBulkReturn) {
      const qty = returnFormData.cantidad || 1;
      setReturnFormData(prev => {
        const currentItems = prev.items || [];
        const newItems = [...currentItems];
        if (newItems.length < qty) {
          for (let i = newItems.length; i < qty; i++) {
            newItems.push({ mismoModelo: false, replacementProductId: "" });
          }
        } else if (newItems.length > qty) {
          newItems.splice(qty);
        }
        return { ...prev, items: newItems };
      });
    }
  }, [returnFormData.cantidad, selectedProduct, isBulkReturn]);

  // Sync auth user
  useEffect(() => {
    if (authUser && !isEditing) {
      setUser(authUser);
      setFormData({
        documentType: authUser.DocumentoTipo || authUser.documentType || "",
        documentNumber: authUser.DocumentoNumero || authUser.documentNumber || "",
        name: authUser.Nombre || authUser.name || "",
        email: authUser.Correo || authUser.email || "",
        phone: authUser.Telefono || authUser.phone || "",
        countryCode: "+57",
        city: authUser.Ciudad || authUser.city || "",
        address: authUser.Direccion || authUser.address || "",
      });
      setAvatarUrl(authUser.avatarUrl || "");
    }
  }, [authUser, isEditing]);

  // Body scroll lock
  useEffect(() => {
    if (showPolicyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showPolicyModal]);

  const showTopToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast({ open: false, text: "" }), 2500); // 2.5 SEGUNDOS
  };

  const handleEditClick = () => setIsEditing(true);

  const handleSaveClick = async () => {
    // 🟢 VALIDACIÓN DE EMAIL (Solo al guardar)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setErrors({ email: "Ingresa un correo de Gmail válido" });
      return;
    }

    // Teléfono según país
    const code = formData.countryCode || '+57';
    const phoneVal = (formData.phone || '').trim();
    const expected = code === '+507' ? 8 : (code === '+34' || code === '+56' || code === '+51') ? 9 : 10;
    if (phoneVal.length !== expected) {
      setErrors({ phone: `El teléfono debe tener ${expected} dígitos para este país` });
      return;
    }

    setErrors({}); // Limpiar errores si todo está bien

    const updatedUser = {
      ...user,
      DocumentoTipo: formData.documentType, documentType: formData.documentType,
      DocumentoNumero: formData.documentNumber, documentNumber: formData.documentNumber,
      Nombre: formData.name, name: formData.name,
      Correo: formData.email, email: formData.email,
      Telefono: formData.phone, phone: formData.phone,
      Ciudad: formData.city, city: formData.city,
      Direccion: formData.address, address: formData.address,
      avatarUrl: avatarUrl || "",
    };
    
    await profileApi.updateProfile(updatedUser);
    setUser(updatedUser);
    if (updateUser) {
      updateUser(updatedUser);
    }
    setIsEditing(false);
    showTopToast("Cambios guardados correctamente.");
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      const code = formData.countryCode || '+57';
      const maxLength = code === '+507' ? 8 : (code === '+34' || code === '+56' || code === '+51') ? 9 : 10;
      value = value.replace(/\D/g, '').slice(0, maxLength);
    }
    setFormData((p) => ({ ...p, [name]: value }));
    
    // Limpiar error del campo mientras el usuario escribe
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };
  
  const getAvatarInitial = () => {
    const name = (formData.name || user?.Nombre || user?.name || "").trim();
    const email = (formData.email || user?.Correo || user?.email || "").trim();
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };
  
  const openFilePicker = () => fileInputRef.current?.click();
  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const newAvatar = reader.result;
      setAvatarUrl(newAvatar);
      if (updateUser) updateUser({ ...user, avatarUrl: newAvatar, FotoPerfil: newAvatar });
      setShowAvatarMenu(false);
      
      try {
        // Guardado automático solo para la foto
        await profileApi.updateProfile({
          ...formData,
          avatarUrl: newAvatar
        });
        showTopToast("Foto de perfil actualizada correctamente.");
      } catch (_err) {
        showTopToast("Error al guardar la foto.");
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleWebcamCapture = async (capturedImageBase64) => {
    setAvatarUrl(capturedImageBase64);
    if (updateUser) updateUser({ ...user, avatarUrl: capturedImageBase64, FotoPerfil: capturedImageBase64 });
    try {
      await profileApi.updateProfile({
        ...formData,
        avatarUrl: capturedImageBase64
      });
      showTopToast("Foto de perfil actualizada correctamente.");
    } catch (_err) {
      showTopToast("Error al guardar la foto.");
    }
  };
  
  const removeAvatar = () => {
    setConfirmModal({
      open: true,
      title: "Eliminar foto de perfil",
      message: "¿Estás seguro de que deseas eliminar tu foto de perfil actual? Esta acción no se puede deshacer.",
      confirmText: "ACEPTAR",
      isDanger: true,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await profileApi.updateProfile({
            ...formData,
            avatarUrl: ""
          });
          setAvatarUrl("");
          if (updateUser) updateUser({ ...user, avatarUrl: "", FotoPerfil: "" });
          setShowAvatarMenu(false);
          setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
          showTopToast("Foto de perfil eliminada.");
        } catch (_err) {
          showTopToast("Error al eliminar la foto.");
          setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
        }
      }
    });
  };

  const openImage = (src) => { 
    if (!src) return; 
    setImageModalSrc(src); 
    setShowImageModal(true); 
  };

  // ⏱️ Verifica si la devolución está expirada (2 minutos después de entrega)
  // Usa la misma lógica que el backend para auto-cambiar de "Enviado" a "Entregado"
  const isReturnExpired = (order) => {
    if (!order) return true;
    const baseDateStr = order.fechaEntrega || order.rawFecha;
    if (!baseDateStr) return true;
    
    const baseDate = new Date(baseDateStr);
    if (isNaN(baseDate.getTime())) return true;
    
    const today = new Date();
    const diffTime = today - baseDate;
    const diffMinutes = diffTime / (1000 * 60);
    
    // Deshabilita después de 2 minutos (igual que el backend)
    return diffMinutes > 2;
  };

  const checkReturnPeriod = (order) => {
    if (isReturnExpired(order)) {
      const baseDateStr = order?.fechaEntrega || order?.rawFecha;
      const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
      const expirationDate = new Date(baseDate);
      expirationDate.setHours(expirationDate.getHours() + 48);

      setExpiredModalData({
        periodDays: 48,
        orderDate: baseDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        expiredDate: expirationDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      });
      setShowExpiredModal(true);
      return false;
    }
    return true;
  };

  const handleReturnClick = (product, order) => {
    if (!checkReturnPeriod(order)) return;
    
    // 🛡️ Calcular cantidad ya devuelta/en curso
    const selId = Number(order.id.replace('PED-', ''));
    const normalizedSelId = selId > 1000 ? selId - 1000 : selId;
    
    const alreadyReturnedQty = allReturns
      .filter(r => {
        const rOrderId = Number(r.rawOrderId);
        const rProductId = Number(r.productId);
        const isMatch = rOrderId === normalizedSelId && rProductId === Number(product.id);
        const isRejected = String(r.status).toLowerCase().includes('rechazad');
        return isMatch && !isRejected;
      })
      .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);

    const purchasedQty = parseInt(product.qty) || 1;
    const maxQty = purchasedQty - alreadyReturnedQty;

    if (maxQty <= 0) {
      showTopToast("Ya se ha solicitado el cambio de todas las unidades de este producto.");
      return;
    }

    setIsBulkReturn(false);
    setSelectedProduct({ ...product, orderId: order.id, maxQty });
    setReturnFormData({ 
      replacementProductId: "", 
      mismoModelo: false, 
      evidence: null, 
      reason: "", 
      cantidad: 1,
      items: [{ mismoModelo: false, replacementProductId: "" }]
    });
    setReturnErrors({});
    setShowPolicyModal(true);
    setActiveTab('returns');
  };

  const handleBulkReturnClick = (order) => {
    if (!order || !order.items?.length) return;
    if (!checkReturnPeriod(order)) return;

    // 🛡️ VERIFICAR SI YA HAY DEVOLUCIONES PARA ESTA ORDEN
    const hasReturn = allReturns.some(r => 
      r.orderId === order.id && 
      !String(r.status).toLowerCase().includes('rechazad')
    );
    if (hasReturn) {
      showTopToast("Este pedido ya cuenta con solicitudes de cambio activas.");
      return;
    }

    setIsBulkReturn(true);
    // Para devolución masiva, seleccionamos el primer producto para el pre-llenado de la UI
    // pero guardaremos la orden completa
    setSelectedProduct({ ...order.items[0], orderId: order.id });
    setReturnFormData({ replacementProductId: "", mismoModelo: false, evidence: null, reason: "" });
    setReturnErrors({});
    setShowPolicyModal(true);
    setActiveTab('returns');
  };

  const handleContinueToReturn = () => {
    setShowPolicyModal(false);
    setShowReturnForm(true);
    setReturnView('form');
  };

  const handleReturnImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReturnFormData(prev => ({ ...prev, evidence: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const getPriceNum = (price) => {
    if (typeof price === 'number') return Math.floor(price);
    if (!price) return 0;
    
    // Remove currency symbol and dots (thousands separator in es-CO)
    // Handle decimals if separated by comma (es-CO standard)
    const clean = price.toString().split(',')[0].replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!returnFormData.reason.trim()) errs.reason = true;
    if (!returnFormData.evidence) errs.evidence = true;
    
    // En devolución masiva forzamos "mismo modelo" para todos para simplificar el flujo
    if (!isBulkReturn) {
      const targetSize = selectedProduct?.size || "U";
      const items = returnFormData.items || [];

      // Validar coincidencia de precio e inexistencia de reemplazo seleccionado
      items.forEach(item => {
        if (!item.mismoModelo && item.replacementProductId) {
          const replacement = initialProducts.find(p => String(p.id) === String(item.replacementProductId));
          const originalProductMatch = initialProducts.find(op => String(op.id) === String(selectedProduct.id));
          const originalPrice = originalProductMatch ? Math.floor(Number(originalProductMatch.precio)) : getPriceNum(selectedProduct?.price);
          if (replacement && Math.floor(Number(replacement.precio)) !== originalPrice) {
            errs.priceMismatch = true;
          }
        }
      });

      // Calcular stock agrupado
      const tally = {};
      items.forEach(item => {
        if (item.mismoModelo) {
          const key = String(selectedProduct.id);
          tally[key] = (tally[key] || 0) + 1;
        } else if (item.replacementProductId) {
          const key = String(item.replacementProductId);
          tally[key] = (tally[key] || 0) + 1;
        }
      });

      // Validar stock agregado de cada uno
      for (const [prodId, reqQty] of Object.entries(tally)) {
        const isOriginal = String(prodId) === String(selectedProduct.id);
        const prod = isOriginal 
          ? initialProducts.find(p => String(p.id) === String(selectedProduct.id))
          : initialProducts.find(p => String(p.id) === String(prodId));

        let availableQty = 0;
        if (prod) {
          if (isOriginal) {
            // Mismo modelo: verificar stock en la talla original
            if (prod.tallasStock && Array.isArray(prod.tallasStock)) {
              const sizeObj = prod.tallasStock.find(ts => String(ts.talla).trim().toUpperCase() === targetSize.trim().toUpperCase());
              availableQty = sizeObj ? (parseInt(sizeObj.cantidad) || 0) : 0;
            } else {
              availableQty = prod.tallas?.includes(targetSize) ? 999 : 0;
            }
          } else {
            // Reemplazo diferente: verificar stock total (cualquier talla)
            if (prod.tallasStock && Array.isArray(prod.tallasStock)) {
              availableQty = prod.tallasStock.reduce((sum, ts) => sum + (parseInt(ts.cantidad) || 0), 0);
            } else {
              availableQty = prod.tallas && prod.tallas.length > 0 ? 999 : 0;
            }
          }
        }

        if (availableQty < reqQty) {
          errs.noStock = true;
          break;
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setReturnErrors(errs);
      if (errs.priceMismatch) showTopToast("El precio de los productos de reemplazo debe ser igual al original.");
      else if (errs.sizeMismatch) showTopToast("Los productos de reemplazo deben estar disponibles en la misma talla.");
      else if (errs.noStock) showTopToast("No hay suficiente stock disponible para alguno de los reemplazos seleccionados.");
      else if (errs.evidence) showTopToast("La foto de evidencia es obligatoria.");
      else showTopToast("Completa los campos obligatorios.");
      return;
    }
    setConfirmModal({
      open: true,
      title: "Confirmar Solicitud de Cambio",
      message: "¿Deseas enviar tu solicitud de cambio ahora? Una vez enviada, el equipo de administración revisará la información y no podrás editarla.",
      confirmText: "ACEPTAR",
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const commonData = {
            idCliente: authUser.idCliente || authUser.IdCliente || authUser.id,
            idVenta: (() => {
              const raw = Number(String(selectedProduct.orderId).replace('PED-', ''));
              return raw > 1000 ? raw - 1000 : raw;
            })(),
            motivo: returnFormData.reason,
            evidencia: returnFormData.evidence,
            cantidad: isBulkReturn ? undefined : Number(returnFormData.cantidad || 1)
          };

          if (isBulkReturn) {
            // Devolución de Pedido Completo: Crear un solo registro para toda la orden
            await profileApi.createReturn({
              ...commonData,
              idProductoOriginal: null,
              idProductoCambio: null,
              mismoModelo: true,
              pedidoCompleto: true,
              idLote: null,
              cantidad: selectedOrder.items.reduce((acc, item) => acc + Number(item.qty), 0),
              precioUnitario: getPriceNum(selectedOrder.total),
              talla: null
            });
          } else {
            // Devolución Individual (con soporte para múltiples unidades y reemplazos diferenciados)
            const hasMultipleItems = returnFormData.items && returnFormData.items.length > 1;
            const idLote = hasMultipleItems ? `LOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}` : null;

            await profileApi.createReturn({
              ...commonData,
              idLote,
              pedidoCompleto: false,
              items: returnFormData.items.map(item => ({
                idProductoOriginal: Number(selectedProduct.id),
                idProductoCambio: item.mismoModelo ? Number(selectedProduct.id) : (item.replacementProductId ? Number(item.replacementProductId) : null),
                mismoModelo: item.mismoModelo,
                cantidad: 1, // Cada registro representa 1 unidad devuelta
                precioUnitario: getPriceNum(selectedProduct.price),
                talla: selectedProduct.size,
              }))
            });
          }

          setIsBulkReturn(false);
          setShowSuccessModal(true);
          setShowReturnForm(false);
          setReturnView('list');
          setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
          loadProfileData();
        } catch (err) {
          console.error("Error submitting return:", err);
          const msg = err.response?.data?.message || "No se pudo enviar la solicitud.";
          showTopToast(msg);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      },
      onCancel: () => {
        // Al cancelar, simplemente cerramos el modal sin hacer nada
        setConfirmModal(p => ({ ...p, open: false }));
      }
    });
  };

  const deactivateAccount = async () => {
    try {
      await profileApi.deactivateAccount();
      // Después de desactivar, cerramos sesión inmediatamente
      onLogout(); 
    } catch (_err) {
      showTopToast("Error al desactivar la cuenta.");
    }
  };

  const deleteAccount = async () => {
    try {
      await profileApi.deleteAccountPermanently();
      // Después de eliminar, cerramos sesión inmediatamente
      onLogout();
    } catch (error) {
      const msg = error.response?.data?.message || "Error al eliminar la cuenta.";
      showTopToast(msg);
    }
  };
  
  const handleMarkAsReceived = async (orderId) => {
    setConfirmModal({
      open: true,
      title: "Confirmar Entrega",
      message: "¿Confirmas que has recibido el pedido correctamente? Esta acción marcará la entrega como finalizada.",
      confirmText: "CONFIRMAR ENTREGA",
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        // 🚀 OPTIMIZACIÓN EXTREMA: Actualizar UI antes de llamar a la API para respuesta instantánea
        const updateFn = o => (o.id === orderId || o.id === `PED-${orderId}`) ? { ...o, statusenvio: 'Entregado' } : o;
        
        setAllOrders(prev => prev.map(updateFn));
        setSelectedOrder(prev => (prev && (prev.id === orderId || prev.id === `PED-${orderId}`)) ? updateFn(prev) : prev);
        
        showTopToast("¡Gracias! El pedido ha sido finalizado.");

        try {
          await profileApi.markOrderAsReceived(orderId);
          loadProfileData(true); // Sincronización silenciosa final
          setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
        } catch (_e) {
          showTopToast("Error al procesar, pero el estado se actualizará pronto.");
          loadProfileData(true);
          setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
        }
      }
    });
  };

  const CACHE_ORDERS = 'user_orders';
  const CACHE_RETURNS = 'user_returns';

  const [allOrders, setAllOrders] = useState(() => {
    const cached = NitroCache.get(CACHE_ORDERS);
    return Array.isArray(cached?.data) ? cached.data : [];
  });
  const [allReturns, setAllReturns] = useState(() => {
    const cached = NitroCache.get(CACHE_RETURNS);
    return Array.isArray(cached?.data) ? cached.data : [];
  });
  const [_isLoadingData, setIsLoadingData] = useState(false); // eslint-disable-line no-unused-vars
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);
  const [hasLoadedReturns, setHasLoadedReturns] = useState(false);

  const loadOrders = async (silent = false) => {
    if (!silent && !hasLoadedOrders) setIsLoadingData(true);
    try {
      const orders = await profileApi.getMyOrders();
      const mappedOrders = mapOrders(orders);
      setAllOrders(mappedOrders);
      NitroCache.set(CACHE_ORDERS, mappedOrders);
      setHasLoadedOrders(true);
      
      // Sincronizar el pedido seleccionado si está abierto
      setSelectedOrder(prev => {
        if (!prev) return null;
        const updated = mappedOrders.find(o => o.id === prev.id);
        return updated ? updated : prev;
      });
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadReturns = async (silent = false) => {
    if (!silent && !hasLoadedReturns) setIsLoadingData(true);
    try {
      const returns = await profileApi.getMyReturns();
      const mappedReturns = mapReturns(returns);
      setAllReturns(mappedReturns);
      NitroCache.set(CACHE_RETURNS, mappedReturns);
      setHasLoadedReturns(true);
      
      // Sincronizar la devolución seleccionada si está abierta
      setSelectedReturn(prev => {
        if (!prev) return null;
        const updated = mappedReturns.find(r => r.id === prev.id);
        return updated ? updated : prev;
      });
    } catch (err) {
      console.error("Error loading returns:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProfileInfo = async () => {
    if (isEditing) return; // 🛡️ Evitar sobreescribir datos del formulario mientras editamos!
    try {
      const perfil = await profileApi.getMiPerfil();
      if (perfil) {
        const profileData = Array.isArray(perfil) ? perfil[0] : perfil;
        updateProfileState(profileData);
      }
    } catch (err) {
      console.error("Error loading profile info:", err);
    }
  };

  const updateProfileState = (profileData) => {
    setAvatarUrl(profileData.avatarUrl || "");
    setFormData(prev => ({
      ...prev,
      documentType: profileData.tipoDocumento || profileData.TipoDocumentoTexto || profileData.TipoDocumento || prev.documentType,
      documentNumber: profileData.numeroDocumento || profileData.Documento || profileData.numero_documento || prev.documentNumber,
      name: profileData.nombreCompleto || profileData.Nombre || profileData.nombre || prev.name,
      phone: profileData.telefono || profileData.Telefono || profileData.phone || prev.phone,
      email: profileData.email || profileData.Email || profileData.Correo || prev.email,
      city: profileData.ciudad || profileData.Ciudad || prev.city,
      address: profileData.direccion || profileData.Direccion || prev.address
    }));
    setUser(prev => ({
      ...prev,
      ...profileData,
      Nombre: profileData.Nombre || profileData.nombreCompleto || profileData.nombre || prev?.Nombre,
      Telefono: profileData.Telefono || profileData.telefono || profileData.phone || prev?.Telefono,
      Correo: profileData.Email || profileData.email || profileData.Correo || prev?.Correo,
      Direccion: profileData.Direccion || profileData.direccion || prev?.Direccion
    }));
  };

  const mapOrders = (orders) => {
    const normalizeStatus = (order) => {
      const rawStatus = order.idEstado || order.IdEstado || order.estado || order.estadoVenta?.nombre || 'Pendiente';
      const lower = String(rawStatus).toLowerCase();
      if (lower.includes('completad') || lower.includes('aprob')) return 'Completada';
      if (lower.includes('rechaz') || lower.includes('anulad')) return 'Rechazado';
      return 'Pendiente';
    };

    const statusColorMap = {
      'Completada': '#10b981',
      'Rechazado': '#ef4444',
      'Anulado': '#6b7280',
      'Pendiente': '#FFC107'
    };

    const getImageUrl = (raw) => {
      if (!raw) return null;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (typeof raw === 'string') {
        if (raw.startsWith('/uploads')) return `${baseUrl}${raw}`;
        if (raw.includes("urlmovil-1.onrender.com")) return raw.replace("https://urlmovil-1.onrender.com", baseUrl);
      }
      return raw;
    };

    return orders.map(o => {
      const status = normalizeStatus(o);
      return {
        id: `PED-${1000 + o.id}`,
        date: new Date(o.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        total: `$${Number(o.total || 0).toLocaleString('es-CO')}`,
        status,
        statusColor: statusColorMap[status] || '#FFC107',
        statusenvio: o.statusenvio || o.StatusEnvio || ((o.tipoEntrega || o.TipoEntrega) === 'recoger' ? 'Preparando' : 'Por enviar'),
        tipoEntrega: o.tipoEntrega || o.TipoEntrega || null,
        paymentMethod: o.metodoPago,
        address: o.direccion || o.direccionEnvio || "Medellín, Colombia",
        phone: o.telefono || o.Telefono || o.Teléfono || null,
        receipt: getImageUrl(o.comprobante || o.Comprobante || o.evidencia),
        receipt2: getImageUrl(o.comprobante2 || o.Comprobante2),
        monto1: o.monto1 || 0,
        monto2: o.monto2 || 0,
        rejectionReason: o.motivoRechazo || o.MotivoRechazo || null,
        fechaEntrega: o.fechaEntrega || o.FechaEntrega || null,
        rawFecha: o.fecha || null,
        items: (o.detalles || []).map(d => ({
          id: d.idProducto || d.id,
          name: d.producto?.nombre || "Producto",
          price: `$${Number(d.precio || d.precioUnitario || d.producto?.precioVenta || 0).toLocaleString('es-CO')}`,
          size: d.talla || "U",
          qty: d.cantidad,
          image: d.producto?.imagenes?.[0] || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg"
        }))
      };
    });
  };

  const mapReturns = (returns) => {
    const getImageUrl = (raw) => {
      if (!raw) return null;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (typeof raw === 'string') {
        if (raw.startsWith('/uploads')) return `${baseUrl}${raw}`;
        if (raw.includes("urlmovil-1.onrender.com")) return raw.replace("https://urlmovil-1.onrender.com", baseUrl);
      }
      return raw;
    };

    return returns.map(r => {
      let statusName = r.idEstado || r.estado || "Pendiente";
      if (statusName === 1 || statusName === "1") statusName = "Completada";
      else if (statusName === 2 || statusName === "2") statusName = "Pendiente";
      else if (statusName === 3 || statusName === "3") statusName = "Rechazada";

      const originalItem = r.ventaOriginal?.detalles?.find(d => 
        String(d.idProducto) === String(r.idProducto)
      );

      const pImg = Array.isArray(r.productoInfo?.imagenes) ? r.productoInfo.imagenes[0] : null;

      const colorMap = {
        'Aprobada': '#10b981',
        'Completada': '#10b981',
        'Rechazada': '#ef4444',
        'Rechazado': '#ef4444',
        'Anulado': '#6b7280',
        'Anulada': '#6b7280',
        'Pendiente': '#FFC107'
      };

      const isPedidoCompleto = r.pedidoCompleto || r.PedidoCompleto || false;
      const parsedAmount = parseFloat(r.valor || r.precioUnitario || 0);

      return {
        id: `DEV-${r.noDevolucion || (1000 + r.id)}`,
        orderId: `PED-${1000 + r.idVenta}`,
        rawOrderId: r.idVenta,
        productId: r.idProducto,
        size: r.talla || originalItem?.talla || "U",
        quantity: r.cantidad || originalItem?.cantidad || 1,
        date: new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: statusName,
        statusColor: colorMap[statusName] || '#FFC107',
        productName: r.productoOriginal || r.nombreProductoOriginal || r.productoInfo?.nombre || "Producto",
        amount: `$${Number(parsedAmount).toLocaleString('es-CO')}`,
        reason: r.motivo || r.descripcion || "Cambio por talla",
        rejectionReason: r.observacion || null,
        productImage: getImageUrl(pImg) || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg",
        evidenceImage: getImageUrl(r.evidencia || r.evidenciaUrl) || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg",
        mismoModelo: (r.mismoModelo === true || r.MismoModelo === true) || (String(r.idProducto || r.IdProducto) === String(r.idProductoCambio || r.IdProductoCambio)),
        replacementProductName: r.productoCambio || r.ProductoCambio || r.producto_cambio || r.product_cambio,
        idLote: r.idLote || null,
        precio: parsedAmount,
        pedidoCompleto: isPedidoCompleto,
        isLot: isPedidoCompleto,
        totalAmount: parsedAmount,
        items: isPedidoCompleto && r.ventaOriginal?.detalles
          ? r.ventaOriginal.detalles.map(item => ({
              id: item.idProducto || item.id,
              productName: item.producto?.nombre || item.NombreProducto || "Producto",
              amount: `$${Number(item.precio || 0).toLocaleString('es-CO')}`,
              price: `$${Number(item.precio || 0).toLocaleString('es-CO')}`,
              size: item.talla || "U",
              quantity: parseInt(item.cantidad || 1),
              qty: parseInt(item.cantidad || 1),
              productImage: getImageUrl(item.producto?.imagenes?.[0]) || "https://res.cloudinary.com/dxc5qqsjd/image/upload/v1762910780/gorraazultodaNY_cyfchf.jpg"
            }))
          : []
      };
    });
  };

  const loadProfileData = async (silent = false) => {
    // Recarga todo si es necesario (p.ej. después de una acción)
    await Promise.all([
      loadProfileInfo(),
      loadOrders(silent),
      loadReturns(silent)
    ]);
  };

  useEffect(() => {
    if (authUser) {
      loadProfileInfo();
    }
  }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authUser) return;
    if (activeTab === 'account') {
      loadOrders();
      loadReturns();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'returns') {
      loadReturns();
    }
  }, [activeTab, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authUser) return;

    // 📡 Listener de sincronización en tiempo real
    const channel = new BroadcastChannel('app_sync');
    channel.onmessage = (event) => {
      if (event.data === 'ventas_updated' || event.data === 'admin_sync') {
        console.log("🚀 Sync detectado: actualizando datos de perfil...");
        loadProfileData(true);
      }
    };

    const interval = setInterval(() => {
      if (activeTab === 'account' || activeTab === 'orders') loadOrders(true);
      if (activeTab === 'account' || activeTab === 'returns') loadReturns(true);
      loadProfileInfo();
    }, 10000); // 10s (Auto-sincronización más rápida)

    return () => {
      channel.close();
      clearInterval(interval);
    };
  }, [authUser, activeTab, selectedOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredOrders = useMemo(() => {
    const q = orderQuery.toLowerCase();
    return allOrders.filter(o => {
      const matchQuery = o.id.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
      const matchStatus = orderStatus === 'Todos' || o.status === orderStatus;
      return matchQuery && matchStatus;
    }).sort((a, b) => {
      const idA = parseInt(a.id.replace('PED-', ''));
      const idB = parseInt(b.id.replace('PED-', ''));
      return idB - idA;
    });
  }, [allOrders, orderQuery, orderStatus]);

  const groupedReturns = useMemo(() => {
    const grouped = [];
    const lotMap = new Map();

    allReturns.forEach(r => {
      if (r.idLote) {
        if (!lotMap.has(r.idLote)) {
          lotMap.set(r.idLote, {
            ...r,
            isLot: true,
            items: [r],
            totalAmount: parseFloat(r.precio || 0)
          });
          grouped.push(lotMap.get(r.idLote));
        } else {
          const lot = lotMap.get(r.idLote);
          lot.items.push(r);
          lot.totalAmount += parseFloat(r.precio || 0);
        }
      } else {
        grouped.push({ ...r, isLot: r.pedidoCompleto || false });
      }
    });

    return grouped.sort((a, b) => {
      const dateB = new Date(b.date || b.fecha);
      const dateA = new Date(a.date || a.fecha);
      return dateB - dateA;
    });
  }, [allReturns]);

  const filteredReturns = useMemo(() => {
    const q = returnQuery.toLowerCase();
    return groupedReturns.filter(r => {
      const displayName = r.isLot ? "devolución de pedido" : r.productName;
      const matchQuery = r.id.toLowerCase().includes(q) || 
                         displayName.toLowerCase().includes(q) || 
                         r.status.toLowerCase().includes(q);
      const matchStatus = returnStatus === 'Todos' || 
                         (returnStatus === 'Completado' && (r.status === 'Completada' || r.status === 'Completado')) ||
                         (returnStatus === 'Rechazado' && (r.status === 'Rechazada' || r.status === 'Rechazado')) ||
                         r.status === returnStatus;
      return matchQuery && matchStatus;
    });
  }, [groupedReturns, returnQuery, returnStatus]);

  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE);
  const paginatedReturns = filteredReturns.slice((returnsPage - 1) * ITEMS_PER_PAGE, returnsPage * ITEMS_PER_PAGE);
  const totalOrderPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const totalReturnPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);

  return {
    user, authUser, isAdmin, onLogout, isEditing, setIsEditing, toast, errors,
    formData, setFormData, showPolicyModal, setShowPolicyModal, showExpiredModal, setShowExpiredModal, expiredModalData, orderQuery, setOrderQuery,
    returnQuery, setReturnQuery, avatarUrl, showAvatarMenu, setShowAvatarMenu, fileInputRef,
    activeTab, setActiveTab, orderView, setOrderView, returnView, setReturnView,
    orderStatus, setOrderStatus, returnStatus, setReturnStatus, returnFormData, setReturnFormData,
    returnErrors, showReturnForm, ordersPage, setOrdersPage, returnsPage, setReturnsPage,
    selectedOrder, setSelectedOrder, selectedReturn, setSelectedReturn, selectedProduct,
    showImageModal, setShowImageModal, imageModalSrc, showSuccessModal, setShowSuccessModal,
    confirmModal, setConfirmModal, initialProducts, paginatedOrders, paginatedReturns,
    totalOrderPages, totalReturnPages, allOrders, allReturns, showTopToast,
    isBulkReturn, setIsBulkReturn, handleBulkReturnClick, groupedReturns,
    handleEditClick, handleSaveClick, handleChange, getAvatarInitial, openFilePicker,
    onPickAvatar, removeAvatar, openImage, handleReturnClick, handleContinueToReturn,
    handleReturnImageUpload, handleReturnSubmit, getPriceNum, deactivateAccount, deleteAccount,
    handleMarkAsReceived, showWebcamModal, setShowWebcamModal, handleWebcamCapture,
    isReturnExpired,
    BULK_MIN_QTY: 6
  };
};
