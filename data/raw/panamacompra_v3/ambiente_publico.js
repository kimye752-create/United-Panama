function _ver_CatalogoGenericoAP() {
	open("catalogo_rubros_ap.aspx", "CatalogoGenerico","width=700, height=400, status=yes, scrollbars=yes, left=50, top=50");
}
function _seleccionar_Demandante(idorgc,nombreorgc)
{
	parent.opener.document.Form1.hidIdOrgC.value = idorgc;
	parent.opener.document.Form1.hidNombreOrgC.value = nombreorgc;
	parent.opener.document.Form1.__EVENTTARGET.value = 'btnElegirDemandante';
	parent.opener.document.Form1.__EVENTARGUMENT.value = '';
	//alert (parent.opener.document.Form1.divPaginacion);
	//parent.opener.document.Form1.divPaginacion.visible = false;
	//parent.opener.document.Form1.divPaginacion.style.visibility='hidden'
	parent.opener.document.Form1.submit();
	self.close();
}
function _seleccionar_Demandante2(idorgc,nombreorgc)
{
	document.Form1.hidIdOrgC.value = idorgc;
	document.Form1.hidNombreOrgC.value = nombreorgc;
	__doPostBack('btnSeleccionarDemandante', '');
	self.close();
}
function _seleccionar_Proveedor(idorgv,nombreorgv)
{
	parent.opener.document.Form1.hidIdOrgV.value = idorgv;
	parent.opener.document.Form1.hidProveedor.value = nombreorgv;
	parent.opener.document.Form1.__EVENTTARGET.value = 'btnElegirProveedor';
	parent.opener.document.Form1.__EVENTARGUMENT.value = '';
	//alert (parent.opener.document.Form1.divPaginacion);
	//parent.opener.document.Form1.divPaginacion.visible = false;
	//parent.opener.document.Form1.divPaginacion.style.visibility='hidden'
	parent.opener.document.Form1.submit();
	self.close();
}
function _ver_BuscarDemandanteAP()
{
	open("buscar_demandante.aspx", "BuscarDemandante","width=700, height=400, status=yes, scrollbars=yes, left=50, top=50");
}
function _ver_adquisicion(strId)
{
	if (strId != '')
	{
		document.Form1.hidRedir.value = strId;
		__doPostBack('btnVerAdquisicion', '');
	}
}

function GoTo(pagina)
{
  parent.detalle.location.href=pagina;
}

function GoTo2(pagina)
{
	//alert('1');
	window.top.frames.location.href=pagina;
}

if(['/portal/','/ambientepublico/'].some(function(e){ return window.location.href.toLowerCase().includes(e); })){
	window.location.replace(window.location.origin);
}