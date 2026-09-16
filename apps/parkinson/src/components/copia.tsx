/**
 * Un dato da copiare (codice fiscale, IBAN) con il suo pulsante.
 *
 * Non è un componente React lato client: il pulsante nasce nascosto e lo
 * accende lo script in fondo alla pagina, solo se il browser sa copiare.
 * Chi ha JavaScript spento, o un telefono vecchio, vede comunque il dato
 * e può selezionarlo a mano: non perde niente.
 */
export function DatoCopiabile({
  etichetta,
  valore,
  nomeDelDato,
}: {
  etichetta: string
  valore: string
  /** Come si chiama il dato quando lo screen reader annuncia la copia. */
  nomeDelDato: string
}) {
  return (
    <div className="dato-copiabile">
      <span className="dato-copiabile__valore">{valore}</span>
      <button
        type="button"
        className="pulsante pulsante--secondario"
        data-copia={valore}
        data-nome={nomeDelDato}
        hidden
      >
        <span data-etichetta>{etichetta}</span>
      </button>
      <span className="solo-lettore" role="status" data-esito />
    </div>
  )
}

/**
 * Lo script che accende i pulsanti "Copia". Scritto in ES5 di proposito:
 * deve funzionare anche su telefoni di parecchi anni fa.
 */
export const SCRIPT_COPIA = `(function(){
if(!navigator.clipboard||!document.querySelectorAll)return;
var b=document.querySelectorAll('button[data-copia]');
for(var i=0;i<b.length;i++){(function(p){
var e=p.querySelector('[data-etichetta]'),s=p.parentNode.querySelector('[data-esito]'),t=e?e.textContent:'',o;
p.hidden=false;
p.addEventListener('click',function(){
navigator.clipboard.writeText(p.getAttribute('data-copia')).then(function(){
if(e)e.textContent='Copiato';
if(s)s.textContent=p.getAttribute('data-nome')+' copiato negli appunti';
clearTimeout(o);o=setTimeout(function(){if(e)e.textContent=t;if(s)s.textContent='';},5000);
})['catch'](function(){if(s)s.textContent='Non sono riuscito a copiare. Seleziona il testo a mano.';});
});
})(b[i]);}
})();`
