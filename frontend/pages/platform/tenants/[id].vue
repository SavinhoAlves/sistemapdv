<template>
  <PlatformShell ativo="restaurantes" :titulo="tenant?.nome || 'Restaurante'">

    <NuxtLink to="/platform/restaurantes" class="pf-back"><ArrowLeft :size="16" /> Restaurantes</NuxtLink>

    <div v-if="loading" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty">
        <b>{{ erro }}</b>
        <NuxtLink to="/platform/restaurantes" class="pf-btn" style="margin-top:12px">Voltar para a lista</NuxtLink>
      </div>
    </div>

    <template v-else-if="tenant">
      <!-- Cabeçalho -->
      <div class="pf-head">
        <div class="pf-hero">
          <span class="pf-av">{{ tenant.nome.slice(0, 2).toUpperCase() }}</span>
          <div>
            <h1 style="font-size:clamp(26px,3.4vw,38px)">{{ tenant.nome }}</h1>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
              <span class="pf-pill" :class="tenant.status === 'ativo' ? 'ok' : 'warn'"><i />{{ tenant.status === 'ativo' ? 'Ativo' : 'Suspenso' }}</span>
              <span class="pf-tag">{{ tenant.slug }}</span>
              <span style="color:var(--pf-muted);font-size:14px">Cliente desde {{ formatDate(tenant.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="pf-btn" @click="abrirModalDados"><Pencil :size="16" /> Editar dados</button>
          <button class="pf-btn" :class="tenant.status === 'ativo' ? 'd' : 'k'" @click="toggleStatus">
            {{ tenant.status === 'ativo' ? 'Suspender' : 'Reativar' }}
          </button>
        </div>
      </div>

      <div class="pf-grid-det">
        <!-- ── Coluna principal ── -->
        <div>
          <!-- Licença -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Licença</h2><p>Sem licença ativa o restaurante não abre o caixa</p></div>
              <button v-if="licencaAtual" class="pf-btn s pf-r" @click="abrirModalLicenca"><Pencil :size="14" /> Editar datas</button>
            </div>
            <div class="pf-pad">
              <div v-if="!licencaAtual" class="pf-empty" style="padding:20px 0"><b>Nenhuma licença registrada</b>Gere um contrato para criar a licença.</div>
              <template v-else>
                <div class="pf-big">
                  <div class="pf-big-n" :class="licencaTom">{{ diasRestantes === null ? '∞' : Math.max(0, diasRestantes) }}</div>
                  <div>
                    <small>Licença</small>
                    <b>{{ licencaStatusLabel }}</b>
                    <small>{{ licencaLabel }}</small>
                  </div>
                </div>

                <dl class="pf-kv" style="margin-bottom:18px">
                  <dt>Ativação</dt><dd>{{ formatDate(licencaAtual.dataAtivacao) }}</dd>
                  <dt>Vencimento</dt><dd>{{ formatDate(licencaAtual.dataVencimento) }}</dd>
                </dl>

                <p class="pf-sub">{{ licencaAtual.status === 'ativado' && diasRestantes !== null && diasRestantes > 0 ? 'Estender licença' : 'Ativar licença' }}</p>
                <div class="pf-opts" style="margin-bottom:10px">
                  <button v-for="periodo in periodos" :key="periodo.label" class="pf-o" :disabled="ativandoLicenca" @click="ativarPeriodo(periodo.dias)">
                    {{ periodo.label }}
                  </button>
                  <button class="pf-o" :disabled="ativandoLicenca" @click="ativarPeriodo(99 * 365)">Ilimitado</button>
                </div>
                <div class="pf-row">
                  <input
                    v-model="diasCustomCard"
                    class="pf-inp"
                    type="number"
                    min="1"
                    placeholder="Outro prazo, em dias"
                    aria-label="Prazo personalizado em dias"
                    @keydown.enter="diasCustomCard && ativarPeriodo(Number(diasCustomCard))"
                  >
                  <button class="pf-btn k" :disabled="ativandoLicenca || !diasCustomCard" @click="diasCustomCard && ativarPeriodo(Number(diasCustomCard))">
                    <Loader2 v-if="ativandoLicenca" :size="16" class="animate-spin" /> Aplicar
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Contrato -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Contrato</h2><p>Contrato de prestação de serviços em PDF</p></div>
              <span v-if="contratoAtual" class="pf-pill" :class="contratoTom(contratoAtual.status)"><i />{{ contratoRotulo(contratoAtual.status) }}</span>
              <button class="pf-btn s" :class="{ 'pf-r': !contratoAtual }" @click="abrirModalContrato">
                <Pencil :size="14" /> {{ contratoAtual ? 'Editar' : 'Gerar contrato' }}
              </button>
            </div>
            <div class="pf-pad">
              <div v-if="!contratoAtual" class="pf-empty" style="padding:20px 0">
                <b>Nenhum contrato gerado</b>
                Gere o contrato pronto para imprimir e assinar.
              </div>
              <template v-else>
                <div class="pf-doc">
                  <span class="pf-ico ok"><FileText :size="20" /></span>
                  <div style="min-width:0">
                    <b>Plano {{ contratoAtual.plano }}</b>
                    <small style="display:block;color:var(--pf-muted)">
                      {{ formatDate(contratoAtual.dataInicio) }} até {{ contratoAtual.dataFim ? formatDate(contratoAtual.dataFim) : 'prazo indeterminado' }}
                      <template v-if="contratoAtual.valor"> · {{ formatCurrency(contratoAtual.valor) }} / {{ contratoAtual.ciclo }}</template>
                    </small>
                  </div>
                </div>
                <div class="pf-acts">
                  <button class="pf-btn s k" @click="visualizarContrato"><Eye :size="16" /> Ver PDF</button>
                  <button class="pf-btn s" @click="imprimirContrato"><Printer :size="16" /> Imprimir</button>
                  <button class="pf-btn s" @click="compartilharContrato"><Share2 :size="16" /> Compartilhar</button>
                </div>
              </template>
            </div>
          </div>

          <!-- Administrador -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Acesso do administrador</h2><p>Login de quem gerencia o restaurante</p></div>
              <span class="pf-pill pf-r" :class="adminAtual ? 'ok' : 'warn'"><i />{{ adminAtual ? 'Configurado' : 'Sem acesso' }}</span>
            </div>
            <div class="pf-pad" style="display:grid;gap:14px">
              <div v-if="!adminAtual" class="pf-note warn">
                <Lock :size="18" style="flex:none;margin-top:1px" />
                Nenhum administrador configurado. Sem ele, o cliente não entra no sistema e o suporte remoto não funciona.
              </div>
              <div class="pf-form">
                <div class="pf-fld full">
                  <label class="pf-lab" for="adm-nome">Nome do administrador</label>
                  <input id="adm-nome" v-model="adminForm.nome" class="pf-inp" type="text" placeholder="Ex.: João Silva">
                </div>
                <div class="pf-fld full">
                  <label class="pf-lab" for="adm-email">E-mail de acesso</label>
                  <input id="adm-email" v-model="adminForm.email" class="pf-inp" type="email" placeholder="admin@restaurante.com" autocomplete="off">
                </div>
                <div class="pf-fld">
                  <label class="pf-lab" for="adm-senha">Nova senha <small>{{ adminAtual ? '(em branco mantém a atual)' : '(mínimo 6 caracteres)' }}</small></label>
                  <div class="pf-pass">
                    <input id="adm-senha" v-model="adminForm.senha" class="pf-inp" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password">
                    <button type="button" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'" @click="mostrarSenha = !mostrarSenha">
                      <EyeOff v-if="mostrarSenha" :size="16" /><Eye v-else :size="16" />
                    </button>
                  </div>
                </div>
                <div class="pf-fld">
                  <label class="pf-lab" for="adm-senha2">Confirmar senha</label>
                  <input
                    id="adm-senha2"
                    v-model="adminForm.senhaConfirm"
                    class="pf-inp"
                    :type="mostrarSenha ? 'text' : 'password'"
                    placeholder="••••••••"
                    autocomplete="new-password"
                    :aria-invalid="!!adminForm.senhaConfirm && adminForm.senhaConfirm !== adminForm.senha"
                  >
                </div>
              </div>
              <p v-if="erroAdmin" class="pf-err">{{ erroAdmin }}</p>
              <p v-if="sucessoAdmin" class="pf-ok-msg"><CheckCircle2 :size="16" /> {{ sucessoAdmin }}</p>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <small v-if="adminAtual" style="color:var(--pf-muted)">Login atual: <b style="color:var(--pf-ink)">{{ adminAtual.email }}</b></small>
                <button class="pf-btn p" style="margin-left:auto" :disabled="salvandoAdmin" @click="salvarAdmin">
                  <Loader2 v-if="salvandoAdmin" :size="16" class="animate-spin" />
                  <ShieldCheck v-else :size="16" />
                  {{ adminAtual ? 'Atualizar acesso' : 'Criar administrador' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Coluna lateral ── -->
        <div>
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Plano e recursos</h2><p>O que este restaurante pode usar</p></div>
            </div>
            <div class="pf-pad">
              <div class="pf-fld" style="margin-bottom:14px">
                <label class="pf-lab" for="det-plano">Plano</label>
                <select id="det-plano" class="pf-inp" :value="tenant.planoId ?? ''" :disabled="trocandoPlano" @change="trocarPlano(($event.target as HTMLSelectElement).value)">
                  <option value="">Sem plano (recursos manuais)</option>
                  <option v-for="pl in planosDisponiveis" :key="pl.id" :value="pl.id">
                    {{ pl.nome }} · {{ formatCurrency(String(pl.valor)) }}/mês{{ pl.ativo ? '' : ' (inativo)' }}
                  </option>
                </select>
                <small v-if="!planos.length" style="color:var(--pf-muted)">
                  Nenhum plano criado ainda. <NuxtLink to="/platform/planos" style="color:var(--pf-brand-d)">Criar planos</NuxtLink>
                </small>
              </div>
              <div v-if="tenant.plano" class="pf-note info" style="margin-bottom:6px">
                Os recursos vêm do plano {{ tenant.plano.nome }}. Para mudar, escolha outro plano acima ou edite o plano em Planos.
              </div>
              <div class="pf-feat">
                <span class="pf-ico" :class="tenant.rfidDisponivel ? 'ok' : ''" style="background:var(--pf-soft)"><CreditCard :size="18" /></span>
                <div><b>RFID</b><small>Login e identificação por crachá</small></div>
                <button class="pf-sw" role="switch" :aria-checked="tenant.rfidDisponivel" aria-label="RFID" :disabled="togglingRfid || !!tenant.plano" @click="toggleRfid" />
              </div>
              <div class="pf-feat">
                <span class="pf-ico" style="background:var(--pf-soft)"><Smartphone :size="18" /></span>
                <div><b>Venda pelo celular</b><small>Acesso via QR Code</small></div>
                <button class="pf-sw" role="switch" :aria-checked="tenant.vendaMobilePermitida" aria-label="Venda pelo celular" :disabled="togglingMobile || !!tenant.plano" @click="toggleMobile" />
              </div>
            </div>
          </div>

          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Dados</h2><p>Cadastro do restaurante</p></div>
              <button class="pf-btn s pf-r" @click="abrirModalDados"><Pencil :size="14" /> Editar</button>
            </div>
            <div class="pf-pad">
              <dl v-if="dadosCadastrais.some(c => c.valor)" class="pf-kv">
                <template v-for="campo in dadosCadastrais" :key="campo.label">
                  <template v-if="campo.valor">
                    <dt>{{ campo.label }}</dt>
                    <dd>{{ campo.valor }}</dd>
                  </template>
                </template>
              </dl>
              <p v-else style="color:var(--pf-muted);margin:0">Nenhum dado preenchido.</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ JANELA DE EDIÇÃO ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalAberto" class="pf-portal pf-veu" @click.self="fecharModal">
          <div class="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-modal-titulo">
            <div class="pf-modal-h">
              <span class="pf-av" style="width:42px;height:42px">
                <component :is="modalModo === 'licenca' ? KeyRound : modalModo === 'contrato' ? FileText : Building2" :size="18" />
              </span>
              <div>
                <h2 id="pf-modal-titulo">{{ modalModo === 'licenca' ? 'Editar licença' : modalModo === 'contrato' ? (contratoAtual ? 'Dados do contrato' : 'Gerar contrato') : 'Editar dados' }}</h2>
                <small style="color:var(--pf-muted)">{{ tenant?.nome }}</small>
              </div>
              <button class="pf-ib" aria-label="Fechar" @click="fecharModal"><X :size="18" /></button>
            </div>

            <div class="pf-modal-b">
              <!-- DADOS -->
              <template v-if="modalModo === 'dados'">
                <div class="pf-boxm">
                  <div class="pf-form">
                    <div class="pf-fld full"><label class="pf-lab" for="f-nome">Nome *</label><input id="f-nome" v-model="form.nome" class="pf-inp" type="text"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-slug">Login (identificador)</label><input id="f-slug" v-model="form.slug" class="pf-inp" type="text"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-cnpj">CNPJ ou CPF</label><input id="f-cnpj" v-model="form.cnpj" class="pf-inp" type="text" placeholder="00.000.000/0001-00"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-resp">Responsável</label><input id="f-resp" v-model="form.responsavel" class="pf-inp" type="text"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-cpfr">CPF do responsável</label><input id="f-cpfr" v-model="form.cpfResponsavel" class="pf-inp" type="text" placeholder="000.000.000-00"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-email">E-mail</label><input id="f-email" v-model="form.contato" class="pf-inp" type="email"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-tel">Telefone</label><input id="f-tel" v-model="form.telefone" class="pf-inp" type="text"></div>
                    <div class="pf-fld full"><label class="pf-lab" for="f-end">Endereço (rua, nº, bairro)</label><input id="f-end" v-model="form.endereco" class="pf-inp" type="text" placeholder="Rua das Flores, 123, Centro"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-cid">Cidade</label><input id="f-cid" v-model="form.cidade" class="pf-inp" type="text"></div>
                    <div class="pf-fld"><label class="pf-lab" for="f-uf">UF</label><input id="f-uf" v-model="form.uf" class="pf-inp" type="text" maxlength="2" placeholder="GO" style="text-transform:uppercase"></div>
                    <div class="pf-fld full"><label class="pf-lab" for="f-obs">Observações</label><textarea id="f-obs" v-model="form.observacoes" class="pf-inp" rows="2" /></div>
                  </div>
                </div>
                <div v-if="!tenant?.plano" class="pf-boxm">
                  <p class="pf-sub" style="margin:0">Recursos</p>
                  <div>
                    <div class="pf-feat">
                      <div><b>Venda pelo celular</b><small>Acesso via QR Code</small></div>
                      <button class="pf-sw" role="switch" :aria-checked="form.vendaMobilePermitida" aria-label="Venda pelo celular" @click="form.vendaMobilePermitida = !form.vendaMobilePermitida" />
                    </div>
                    <div class="pf-feat">
                      <div><b>RFID</b><small>Login e identificação por crachá</small></div>
                      <button class="pf-sw" role="switch" :aria-checked="form.rfidDisponivel" aria-label="RFID" @click="form.rfidDisponivel = !form.rfidDisponivel" />
                    </div>
                  </div>
                </div>
              </template>

              <!-- CONTRATO -->
              <template v-else-if="modalModo === 'contrato'">
                <div class="pf-note info">
                  <FileText :size="18" style="flex:none;margin-top:1px" />
                  Estes dados geram o contrato de prestação de serviços em PDF, pronto para imprimir e assinar.
                </div>
                <div class="pf-boxm">
                  <div class="pf-form">
                    <div class="pf-fld full">
                      <label class="pf-lab" for="c-plano">Plano *</label>
                      <select id="c-plano" v-model="planoOpcao" class="pf-inp" @change="onPlanoOpcaoChange">
                        <option value="Básico">Básico</option>
                        <option value="Profissional">Profissional</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="personalizado">Personalizado…</option>
                      </select>
                      <input v-if="planoOpcao === 'personalizado'" v-model="contratoForm.plano" class="pf-inp" type="text" placeholder="Nome do plano" aria-label="Nome do plano">
                    </div>
                    <div class="pf-fld"><label class="pf-lab" for="c-valor">Valor (R$)</label><input id="c-valor" v-model="contratoForm.valor" class="pf-inp" type="number" min="0" step="0.01" placeholder="0,00"></div>
                    <div class="pf-fld">
                      <label class="pf-lab" for="c-ciclo">Ciclo</label>
                      <select id="c-ciclo" v-model="contratoForm.ciclo" class="pf-inp">
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div class="pf-fld"><label class="pf-lab" for="c-ini">Início</label><input id="c-ini" v-model="contratoForm.dataInicio" class="pf-inp" type="date"></div>
                    <div class="pf-fld"><label class="pf-lab" for="c-fim">Fim</label><input id="c-fim" v-model="contratoForm.dataFim" class="pf-inp" type="date"></div>
                    <div class="pf-fld full">
                      <span class="pf-lab">Situação</span>
                      <div class="pf-seg">
                        <button v-for="s in contratoStatuses" :key="s.value" :class="[s.tom, { sel: contratoForm.status === s.value }]" @click="contratoForm.status = s.value">{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pf-boxm">
                  <p class="pf-sub" style="margin:0">Validade da licença</p>
                  <div class="pf-opts">
                    <button v-for="p in periodos" :key="p.label" class="pf-o" :class="{ sel: diasCustomModal === String(p.dias) }" @click="setLicPeriodo(p.dias)">{{ p.label }}</button>
                    <button class="pf-o" :class="{ sel: contratoForm.licVencimento === '2099-12-31' }" @click="setLicPermanente">Ilimitado</button>
                  </div>
                  <div class="pf-row">
                    <input v-model="diasCustomModal" class="pf-inp" type="number" min="1" placeholder="Outro prazo, em dias" aria-label="Prazo da licença em dias" @keydown.enter="aplicarDiasCustomModal">
                    <button class="pf-btn k" @click="aplicarDiasCustomModal">Aplicar</button>
                  </div>
                  <div class="pf-form">
                    <div class="pf-fld"><label class="pf-lab" for="c-lat">Ativação</label><input id="c-lat" v-model="contratoForm.licAtivacao" class="pf-inp" type="date"></div>
                    <div class="pf-fld"><label class="pf-lab" for="c-lve">Vencimento</label><input id="c-lve" v-model="contratoForm.licVencimento" class="pf-inp" type="date"></div>
                  </div>
                  <small style="color:var(--pf-muted)">Com o vencimento preenchido, a licença é ativada ao salvar.</small>
                </div>
              </template>

              <!-- LICENÇA -->
              <div v-else-if="modalModo === 'licenca'" class="pf-boxm">
                <div class="pf-fld">
                  <span class="pf-lab">Situação</span>
                  <div class="pf-seg">
                    <button v-for="s in licencaStatuses" :key="s.value" :class="[s.tom, { sel: licencaForm.status === s.value }]" @click="licencaForm.status = s.value">{{ s.label }}</button>
                  </div>
                </div>
                <div class="pf-form">
                  <div class="pf-fld"><label class="pf-lab" for="l-at">Ativação</label><input id="l-at" v-model="licencaForm.dataAtivacao" class="pf-inp" type="date"></div>
                  <div class="pf-fld"><label class="pf-lab" for="l-ve">Vencimento</label><input id="l-ve" v-model="licencaForm.dataVencimento" class="pf-inp" type="date"></div>
                </div>
              </div>

              <p v-if="erroModal" class="pf-err">{{ erroModal }}</p>
            </div>

            <div class="pf-modal-f">
              <button class="pf-btn" @click="fecharModal">Cancelar</button>
              <button class="pf-btn p" :disabled="salvando" @click="salvar">
                <Loader2 v-if="salvando" :size="16" class="animate-spin" />
                {{ salvando ? 'Salvando…' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ CONFIRMAÇÃO ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDialog.show" class="pf-portal pf-veu" style="align-items:center;z-index:70" @click.self="confirmDialog.resolve?.(false); confirmDialog.show = false">
          <div class="pf-modal sm" role="alertdialog" aria-modal="true">
            <div class="pf-confirm">
              <span class="pf-ico" :class="confirmDialog.type === 'danger' ? 'bad' : 'ok'" style="width:52px;height:52px;border-radius:16px">
                <AlertTriangle v-if="confirmDialog.type === 'danger'" :size="22" />
                <CheckCircle2 v-else :size="22" />
              </span>
              <h2 style="font-size:20px">{{ confirmDialog.title }}</h2>
              <p>{{ confirmDialog.message }}</p>
            </div>
            <div class="pf-modal-f">
              <button class="pf-btn" @click="confirmDialog.resolve?.(false); confirmDialog.show = false">Cancelar</button>
              <button class="pf-btn" :class="confirmDialog.type === 'danger' ? 'd' : 'p'" @click="confirmDialog.resolve?.(true); confirmDialog.show = false">Confirmar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Aviso -->
    <Transition name="toast">
      <div v-if="toastMsg.text" class="pf-toast" :class="toastMsg.type === 'success' ? 'ok' : 'bad'" role="status">
        <CheckCircle2 v-if="toastMsg.type === 'success'" :size="18" />
        <AlertCircle v-else :size="18" />
        {{ toastMsg.text }}
      </div>
    </Transition>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  ArrowLeft, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, AlertTriangle, CheckCircle2, Pencil, X, FileText, KeyRound,
  Eye, EyeOff, Printer, Share2, ShieldCheck, Lock,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { usePlanos } from '~/composables/usePlanos'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio: string | null; dataFim: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  planoId: string | null; plano: { id: string; nome: string; valor: string | number } | null
  licencas: Licenca[]; contratos: Contrato[]
}

const route             = useRoute()
const platformAuth      = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()
const { planos, carregar: carregarPlanos } = usePlanos()

// Planos ativos + o plano atual (mesmo se inativo, para continuar aparecendo)
const planosDisponiveis = computed(() => planos.value.filter(pl => pl.ativo || pl.id === tenant.value?.planoId))
const trocandoPlano = ref(false)

async function trocarPlano(planoId: string) {
  if (!tenant.value || trocandoPlano.value) return
  trocandoPlano.value = true
  try {
    const r = await platformFetch<{ planoId: string | null; rfidDisponivel: boolean; vendaMobilePermitida: boolean; plano: Tenant['plano'] }>(
      `/platform/tenants/${tenant.value.id}/plano`,
      { method: 'PATCH', body: JSON.stringify({ planoId: planoId || null }) },
    )
    Object.assign(tenant.value, r)
    showToast('success', r.plano ? `Plano ${r.plano.nome} aplicado` : 'Plano removido; recursos agora são manuais')
  } catch (e: any) {
    showToast('error', e?.message || 'Não foi possível trocar o plano')
  } finally {
    trocandoPlano.value = false
  }
}

const tenant         = ref<Tenant | null>(null)
const loading        = ref(false)
const erro           = ref('')
const togglingRfid    = ref(false)
const togglingMobile  = ref(false)
const ativandoLicenca = ref(false)
const diasCustomCard  = ref('')

const confirmDialog = reactive({
  show: false, title: '', message: '', type: 'danger' as 'danger' | 'success',
  resolve: null as ((v: boolean) => void) | null,
})
function showConfirm(title: string, message: string, type: 'danger' | 'success' = 'danger'): Promise<boolean> {
  return new Promise(resolve => {
    Object.assign(confirmDialog, { title, message, type, resolve, show: true })
  })
}
const toastMsg       = reactive({ text: '', type: 'success' as 'success' | 'error' })

const modalAberto = ref(false)
const modalModo   = ref<'dados' | 'licenca' | 'contrato'>('dados')
const salvando    = ref(false)
const erroModal   = ref('')

// ── Acesso do administrador ───────────────────────────────────────────────────
const adminAtual      = ref<{ id: string; nome: string; email: string; ativo: boolean } | null>(null)
const adminForm       = reactive({ nome: '', email: '', senha: '', senhaConfirm: '' })
const mostrarSenha    = ref(false)
const salvandoAdmin   = ref(false)
const erroAdmin       = ref('')
const sucessoAdmin    = ref('')

async function carregarAdmin() {
  const data = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`)
  adminAtual.value = data
  if (data) { adminForm.nome = data.nome; adminForm.email = data.email }
  adminForm.senha = ''; adminForm.senhaConfirm = ''
}

async function salvarAdmin() {
  erroAdmin.value = ''; sucessoAdmin.value = ''
  if (!adminForm.email.trim()) { erroAdmin.value = 'E-mail é obrigatório'; return }
  if (adminForm.senha && adminForm.senha.length < 6) { erroAdmin.value = 'Senha deve ter no mínimo 6 caracteres'; return }
  if (adminForm.senha !== adminForm.senhaConfirm) { erroAdmin.value = 'As senhas não conferem'; return }
  if (!adminAtual.value && !adminForm.senha) { erroAdmin.value = 'Defina uma senha para criar o administrador'; return }
  salvandoAdmin.value = true
  try {
    const res = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ nome: adminForm.nome, email: adminForm.email, senha: adminForm.senha || undefined }),
    })
    adminAtual.value = res
    adminForm.senha = ''; adminForm.senhaConfirm = ''
    sucessoAdmin.value = adminAtual.value ? 'Credenciais atualizadas' : 'Administrador criado'
    setTimeout(() => { sucessoAdmin.value = '' }, 3000)
  } catch (e: any) {
    erroAdmin.value = e?.message || 'Erro ao salvar'
  } finally {
    salvandoAdmin.value = false
  }
}

const form = reactive({ nome: '', slug: '', cnpj: '', cpfResponsavel: '', responsavel: '', contato: '', telefone: '', endereco: '', cidade: '', uf: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   tom: 'ok' },
  { value: 'pendente',  label: 'Pendente',  tom: 'warn' },
  { value: 'bloqueado', label: 'Bloqueada', tom: 'bad' },
]
const contratoForm = reactive({ plano: '', valor: '', ciclo: 'mensal', dataInicio: '', dataFim: '', status: 'trial', licAtivacao: '', licVencimento: '' })
const contratoStatuses = [
  { value: 'ativo',     label: 'Assinado',       tom: 'ok' },
  { value: 'trial',     label: 'Ag. assinatura', tom: 'warn' },
  { value: 'suspenso',  label: 'Suspenso',       tom: 'bad' },
  { value: 'cancelado', label: 'Rescindido',     tom: 'bad' },
]
const periodos = [
  { label: '30d',   dias: 30   },
  { label: '90d',   dias: 90   },
  { label: '6 meses', dias: 180 },
  { label: '1 ano', dias: 365  },
]

const licencaAtual  = computed(() => tenant.value?.licencas?.[0] ?? null)
const contratoAtual = computed(() => tenant.value?.contratos?.[0] ?? null)

const AVATAR_GLOWS = [
  'rgba(124,58,237,0.07)', 'rgba(14,165,233,0.07)',
  'rgba(16,185,129,0.07)', 'rgba(245,158,11,0.07)',
  'rgba(244,63,94,0.07)',  'rgba(99,102,241,0.07)',
  'rgba(20,184,166,0.07)', 'rgba(249,115,22,0.07)',
]
const avatarGlow = computed(() => {
  if (!tenant.value) return ''
  const idx = tenant.value.nome.charCodeAt(0) % AVATAR_GLOWS.length
  return `background: radial-gradient(circle, ${AVATAR_GLOWS[idx]} 0%, transparent 70%)`
})

const diasRestantes = computed(() => {
  if (!licencaAtual.value?.dataVencimento) return null
  return Math.ceil((new Date(licencaAtual.value.dataVencimento!).getTime() - Date.now()) / 86400000)
})
const licencaStatusLabel = computed(() => {
  const s = licencaAtual.value?.status
  if (s === 'ativado') return 'Ativa'
  if (s === 'pendente') return 'Pendente'
  return 'Bloqueada'
})
const licencaLabel = computed(() => {
  const lic = licencaAtual.value
  if (!lic) return ''
  if (lic.status === 'ativado' && lic.dataVencimento) {
    const d = diasRestantes.value!
    if (d < 0)  return 'Licença expirada'
    if (d <= 7) return `Vence em ${d} dia(s)`
    return `Válida até ${formatDate(lic.dataVencimento)}`
  }
  if (lic.status === 'pendente') return 'Aguardando ativação'
  return 'Licença bloqueada'
})
const licencaTom = computed<'ok' | 'warn' | 'bad'>(() => {
  const st = licencaAtual.value?.status
  if (st !== 'ativado') return st === 'pendente' ? 'warn' : 'bad'
  if (diasRestantes.value !== null && diasRestantes.value < 0) return 'bad'
  if (diasRestantes.value !== null && diasRestantes.value <= 7) return 'warn'
  return 'ok'
})

const contratoTom = (s: string) => contratoStatuses.find(c => c.value === s)?.tom ?? 'mute'
const contratoRotulo = (s: string) => contratoStatuses.find(c => c.value === s)?.label ?? s

const dadosCadastrais = computed(() => [
  { label: 'CNPJ / CPF',       valor: tenant.value?.cnpj,                          mono: true  },
  { label: 'Responsável',      valor: tenant.value?.responsavel,                   mono: false },
  { label: 'CPF do responsável', valor: (tenant.value as any)?.cpfResponsavel,     mono: true  },
  { label: 'E-mail',           valor: tenant.value?.contato,                       mono: false },
  { label: 'Telefone',         valor: tenant.value?.telefone,                      mono: false },
  { label: 'Endereço',         valor: tenant.value?.endereco,                      mono: false },
  { label: 'Cidade / UF',      valor: [(tenant.value as any)?.cidade, (tenant.value as any)?.uf].filter(Boolean).join(' — ') || null, mono: false },
  { label: 'Observações',      valor: tenant.value?.observacoes,                   mono: false },
])

function contratoStatusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'trial' ? 'bg-sky-500/15 text-sky-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: string | number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) }
function showToast(type: 'success' | 'error', text: string) { toastMsg.type = type; toastMsg.text = text; setTimeout(() => { toastMsg.text = '' }, 3000) }


async function carregar() {
  loading.value = true; erro.value = ''
  try {
    tenant.value = await platformFetch<Tenant>(`/platform/tenants/${route.params.id}`)
    await carregarAdmin()
  }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModalDados() {
  if (!tenant.value) return
  const t = tenant.value
  Object.assign(form, { nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', cpfResponsavel: (t as any).cpfResponsavel || '', responsavel: t.responsavel || '', contato: t.contato || '', telefone: t.telefone || '', endereco: t.endereco || '', cidade: (t as any).cidade || '', uf: (t as any).uf || '', observacoes: t.observacoes || '', vendaMobilePermitida: t.vendaMobilePermitida, rfidDisponivel: t.rfidDisponivel })
  modalModo.value = 'dados'; erroModal.value = ''; modalAberto.value = true
}

function abrirModalContrato() {
  const c   = contratoAtual.value
  const lic = licencaAtual.value
  const planoInicial = c?.plano || 'Básico'
  planoOpcao.value = PLANOS_PADRAO.includes(planoInicial) ? planoInicial : 'personalizado'
  Object.assign(contratoForm, {
    plano:         planoInicial,
    valor:         c?.valor || '',
    ciclo:         c?.ciclo || 'mensal',
    dataInicio:    c?.dataInicio?.substring(0, 10) || new Date().toISOString().substring(0, 10),
    dataFim:       c?.dataFim?.substring(0, 10) || '',
    status:        c?.status || 'trial',
    licAtivacao:   lic?.dataAtivacao?.substring(0, 10)  || new Date().toISOString().substring(0, 10),
    licVencimento: lic?.dataVencimento?.substring(0, 10) || '',
  })
  modalModo.value = 'contrato'; erroModal.value = ''; modalAberto.value = true
}

const diasCustomModal = ref('')

const PLANOS_PADRAO = ['Básico', 'Profissional', 'Enterprise']
const planoOpcao   = ref('Básico')

function onPlanoOpcaoChange() {
  if (planoOpcao.value !== 'personalizado') contratoForm.plano = planoOpcao.value
}

function setLicPeriodo(dias: number) {
  const hoje = new Date()
  const venc = new Date(hoje.getTime() + dias * 86400000)
  contratoForm.licAtivacao   = hoje.toISOString().substring(0, 10)
  contratoForm.licVencimento = venc.toISOString().substring(0, 10)
  diasCustomModal.value = String(dias)
}

function setLicPermanente() {
  contratoForm.licAtivacao   = new Date().toISOString().substring(0, 10)
  contratoForm.licVencimento = '2099-12-31'
  diasCustomModal.value = ''
}

function aplicarDiasCustomModal() {
  const d = parseInt(diasCustomModal.value)
  if (!d || d <= 0) return
  const hoje = new Date()
  const venc = new Date(hoje.getTime() + d * 86400000)
  contratoForm.licAtivacao   = hoje.toISOString().substring(0, 10)
  contratoForm.licVencimento = venc.toISOString().substring(0, 10)
}

function abrirModalLicenca() {
  const lic = licencaAtual.value
  licencaForm.status        = lic?.status || 'pendente'
  licencaForm.dataAtivacao  = lic?.dataAtivacao?.substring(0, 10)  || ''
  licencaForm.dataVencimento = lic?.dataVencimento?.substring(0, 10) || ''
  modalModo.value = 'licenca'; erroModal.value = ''; modalAberto.value = true
}

function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  salvando.value = true
  try {
    if (modalModo.value === 'dados') {
      if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; salvando.value = false; return }
      await platformFetch(`/platform/tenants/${tenant.value!.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }),
      })
      showToast('success', 'Dados atualizados!')
    } else if (modalModo.value === 'licenca') {
      await platformFetch(`/platform/tenants/${tenant.value!.id}/licenca`, {
        method: 'PUT',
        body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }),
      })
      showToast('success', 'Licença atualizada!')
    } else if (modalModo.value === 'contrato') {
      if (!contratoForm.plano.trim()) { erroModal.value = 'Plano é obrigatório'; salvando.value = false; return }
      await platformFetch(`/platform/tenants/${tenant.value!.id}/contrato`, {
        method: 'PUT',
        body: JSON.stringify({ plano: contratoForm.plano, valor: contratoForm.valor || null, ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, dataFim: contratoForm.dataFim || null, status: contratoForm.status }),
      })
      if (contratoForm.licVencimento) {
        await platformFetch(`/platform/tenants/${tenant.value!.id}/licenca`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'ativado', dataAtivacao: contratoForm.licAtivacao || new Date().toISOString().substring(0, 10), dataVencimento: contratoForm.licVencimento }),
        })
      }
      showToast('success', 'Contrato e licença atualizados!')
    }
    fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function ativarPeriodo(dias: number) {
  if (!tenant.value || ativandoLicenca.value) return
  ativandoLicenca.value = true
  try {
    const hoje = new Date()
    const lic = licencaAtual.value
    const base = lic?.status === 'ativado' && lic.dataVencimento && new Date(lic.dataVencimento) > hoje
      ? new Date(lic.dataVencimento)
      : hoje
    const vencimento = new Date(base.getTime() + dias * 86400000)
    await platformFetch(`/platform/tenants/${tenant.value.id}/licenca`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'ativado',
        dataAtivacao: hoje.toISOString().substring(0, 10),
        dataVencimento: vencimento.toISOString().substring(0, 10),
      }),
    })
    showToast('success', `Licença ${base > hoje ? 'estendida' : 'ativada'} por ${dias} dia(s)!`)
    await carregar()
  } catch (e: any) { showToast('error', e?.message || 'Erro ao ativar') }
  finally { ativandoLicenca.value = false }
}

async function toggleMobile() {
  if (!tenant.value || togglingMobile.value) return
  togglingMobile.value = true
  const novo = !tenant.value.vendaMobilePermitida
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/mobile`, { method: 'PATCH', body: JSON.stringify({ permitida: novo }) })
    tenant.value.vendaMobilePermitida = novo
    showToast('success', novo ? 'Venda pelo Celular habilitada' : 'Venda pelo Celular desabilitada')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingMobile.value = false }
}

async function toggleRfid() {
  if (!tenant.value || togglingRfid.value) return
  togglingRfid.value = true
  const novo = !tenant.value.rfidDisponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.value.rfidDisponivel = novo
    showToast('success', novo ? 'RFID habilitado' : 'RFID desabilitado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingRfid.value = false }
}

async function toggleStatus() {
  if (!tenant.value) return
  const novoStatus = tenant.value.status === 'ativo' ? 'suspenso' : 'ativo'
  const ok = await showConfirm(
    novoStatus === 'suspenso' ? `Suspender "${tenant.value.nome}"?` : `Reativar "${tenant.value.nome}"?`,
    novoStatus === 'suspenso'
      ? 'O tenant ficará inacessível até ser reativado manualmente.'
      : 'O tenant voltará a funcionar normalmente.',
    novoStatus === 'suspenso' ? 'danger' : 'success'
  )
  if (!ok) return
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.value.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? 'Tenant suspenso' : 'Tenant reativado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
}


// ── GERAÇÃO DE CONTRATO PDF ──────────────────────────────────────────────────

const CONTRATADA = {
  razaoSocial:        'SavioAlves Tecnologia LTDA ME',
  nomeFantasia:       'OmniFlow Systems',
  cnpj:               '45.678.901/0001-23',
  inscricaoEstadual:  'Isento',
  endereco:           'Rua das Flores, 256, Sala 04',
  bairro:             'Setor Bueno',
  cidade:             'Goiânia',
  uf:                 'GO',
  cep:                '74.210-050',
  telefone:           '(62) 9 9912-3456',
  email:              'suporte.savioalves@gmail.com',
  site:               'www.omniflow.com.br',
  representante:      'Sávio Ferreira Alves',
  cpfRepresentante:   '123.456.789-00',
  rgRepresentante:    '1.234.567 SSP/GO',
  cargoRepresentante: 'Administrador',
  foroCidade:         'Goiânia',
  foroUF:             'GO',
}

function visualizarContrato() { gerarContratoPDF() }

function imprimirContrato() {
  const win = gerarContratoPDF()
  if (win) setTimeout(() => { try { win.print() } catch {} }, 800)
}

async function compartilharContrato() {
  if (!tenant.value) return
  const t = tenant.value
  const c = contratoAtual.value
  const texto = `Contrato PDV — ${t.nome}\nPlano: ${c?.plano || '—'}\nValor: ${c?.valor ? formatCurrency(c.valor) : '—'}/${c?.ciclo || '—'}\nVigência: ${formatDate(c?.dataInicio)} → ${c?.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}\nContato: ${t.contato || '—'}`
  try {
    if (navigator.share) {
      await navigator.share({ title: `Contrato — ${t.nome}`, text: texto })
    } else {
      await navigator.clipboard.writeText(texto)
      showToast('success', 'Resumo copiado para a área de transferência')
    }
  } catch {}
}

function escapeHtml(val: unknown): string {
  if (val == null) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function gerarContratoPDF(): Window | null {
  if (!tenant.value) return null
  const t = tenant.value
  const c = contratoAtual.value

  const fmtD = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'
  const fmtM = (v: string | number | null | undefined) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'a definir em aditivo'

  const plano    = c?.plano || 'Básico'
  const valor    = fmtM(c?.valor)

  // Campos da API sanitizados antes de injetar no HTML
  const esc = escapeHtml
  const sNome          = esc(t.nome)
  const sSlug          = esc(t.slug)
  const sCnpj          = esc(t.cnpj)
  const sCpfResponsavel = esc((t as any).cpfResponsavel)
  const sEndereco      = esc(t.endereco)
  const sCidade        = esc((t as any).cidade)
  const sUF            = esc((t as any).uf)
  const sTelefone      = esc(t.telefone)
  const sContato       = esc(t.contato)
  const sResponsavel   = esc(t.responsavel)
  const sPlano         = esc(plano)
  const sObs        = t.observacoes ? esc(t.observacoes).replace(/\n/g, '<br>') : ''
  const ciclo    = c?.ciclo || 'mensal'
  const cicloMap: Record<string, string> = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' }
  const cicloExtMap: Record<string, string> = { mensal: '30 (trinta) dias', trimestral: '3 (três) meses', semestral: '6 (seis) meses', anual: '12 (doze) meses' }
  const inicio   = c?.dataInicio ? new Date(c.dataInicio) : new Date()
  const fim      = c?.dataFim ? new Date(c.dataFim) : null
  const vigencia = fim
    ? `de ${fmtD(inicio)} a ${fmtD(fim)}`
    : `a partir de ${fmtD(inicio)}, por prazo indeterminado`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Contrato — ${sNome}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; line-height: 1.75; }
    .page { max-width: 820px; margin: 0 auto; }
    .header-bar { background: linear-gradient(135deg, #1a1f3c 0%, #2d3680 100%); padding: 26px 48px; display: flex; align-items: center; justify-content: space-between; }
    .brand-block { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.12); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }
    .brand-name { color: #fff; font-size: 17pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1; display: block; }
    .brand-sub { color: rgba(255,255,255,0.4); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: block; margin-top: 3px; }
    .header-ref { text-align: right; }
    .doc-type { color: rgba(255,255,255,0.75); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; }
    .doc-num { color: rgba(255,255,255,0.4); font-size: 8pt; font-weight: 600; margin-top: 4px; display: block; }
    .title-section { background: #f5f6ff; border-bottom: 1px solid #dde0f5; padding: 22px 48px; text-align: center; }
    .contract-title { font-size: 12.5pt; font-weight: 900; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.8px; }
    .contract-subtitle { font-size: 9.5pt; color: #6b7280; margin-top: 4px; }
    .plano-badge { display: inline-flex; align-items: center; background: #ede9fe; color: #4f46e5; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 12px; border-radius: 999px; margin-top: 8px; }
    .body { padding: 32px 48px 48px; }
    .section-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
    .party-card { border-radius: 10px; border: 1px solid #dde0f5; overflow: hidden; }
    .party-card-header { padding: 10px 16px; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .party-card-contratada .party-card-header { background: #1a1f3c; color: #fff; }
    .party-card-contratante .party-card-header { background: #4f46e5; color: #fff; }
    .party-card-body { padding: 14px 16px; background: #fafaff; }
    .pfield { margin-bottom: 5px; font-size: 9.5pt; color: #374151; line-height: 1.45; }
    .pfield strong { font-weight: 700; color: #1a1f3c; font-size: 8.5pt; }
    .clauses-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .clauses-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .clause { margin-bottom: 22px; }
    .clause-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .clause-num { width: 26px; height: 26px; border-radius: 7px; background: #1a1f3c; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; font-weight: 900; flex-shrink: 0; text-align: center; line-height: 26px; }
    .clause-title { font-size: 10pt; font-weight: 800; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.4px; }
    .clause p { margin-bottom: 8px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause ol { padding-left: 22px; margin-top: 6px; margin-bottom: 8px; }
    .clause ol li { margin-bottom: 5px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause .paragrafo { margin-top: 8px; font-size: 10.5pt; text-align: justify; color: #374151; padding: 10px 14px; background: #f5f6ff; border-left: 3px solid #4f46e5; border-radius: 0 6px 6px 0; }
    .clause .paragrafo::before { content: "Parágrafo único. "; font-weight: 800; }
    .notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 28px; font-size: 10.5pt; color: #374151; }
    .sig-section { margin-top: 44px; padding-top: 20px; border-top: 2px solid #dde0f5; }
    .sig-city { font-size: 10.5pt; color: #374151; margin-bottom: 50px; text-align: center; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
    .sig-block { text-align: center; }
    .sig-line-el { border-top: 1.5px solid #374151; margin-bottom: 8px; }
    .sig-name { font-size: 10pt; font-weight: 700; color: #1a1f3c; }
    .sig-role { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
    .witness-label { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 24px; }
    .witness-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .witness-block { text-align: center; }
    .witness-field { font-size: 9pt; color: #6b7280; margin-top: 6px; }
    .footer { padding: 14px 48px; background: #f5f6ff; border-top: 1px solid #dde0f5; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #9ca3af; }
    .footer-brand { font-weight: 800; color: #1a1f3c; }
    @media print {
      body { font-size: 10.5pt; }
      .page { padding: 0; }
      @page { margin: 2cm 1.8cm; }
      .header-bar, .party-card-contratada .party-card-header, .party-card-contratante .party-card-header, .clause-num, .clause .paragrafo, .title-section, .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header-bar">
    <div class="brand-block">
      <div class="brand-icon">⚡</div>
      <div>
        <span class="brand-name">Restaurante PDV</span>
        <span class="brand-sub">Sistema de Gestão PDV</span>
      </div>
    </div>
    <div class="header-ref">
      <span class="doc-type">Contrato de Prestação de Serviços</span>
      <span class="doc-num">Ref.: ${sSlug.toUpperCase()}-${inicio.getFullYear()}</span>
    </div>
  </div>

  <div class="title-section">
    <div class="contract-title">Contrato de Prestação de Serviços de Tecnologia</div>
    <div class="contract-subtitle">Modalidade SaaS — Sistema de Ponto de Venda</div>
    <div class="plano-badge">Plano ${sPlano}</div>
  </div>

  <div class="body">

    <div class="section-label">Partes Contratantes</div>
    <div class="parties-grid">
      <div class="party-card party-card-contratada">
        <div class="party-card-header">Contratada</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social:</strong> ${CONTRATADA.razaoSocial}</p>
          <p class="pfield"><strong>Nome Fantasia:</strong> ${CONTRATADA.nomeFantasia}</p>
          <p class="pfield"><strong>CNPJ:</strong> ${CONTRATADA.cnpj} · IE ${CONTRATADA.inscricaoEstadual}</p>
          <p class="pfield"><strong>Endereço:</strong> ${CONTRATADA.endereco}, ${CONTRATADA.bairro}, ${CONTRATADA.cidade}/${CONTRATADA.uf} — CEP ${CONTRATADA.cep}</p>
          <p class="pfield"><strong>Contato:</strong> ${CONTRATADA.telefone} · ${CONTRATADA.email}</p>
          <p class="pfield"><strong>Representante:</strong> ${CONTRATADA.representante} · CPF ${CONTRATADA.cpfRepresentante}</p>
        </div>
      </div>
      <div class="party-card party-card-contratante">
        <div class="party-card-header">Contratante</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social / Nome:</strong> ${sNome}</p>
          <p class="pfield"><strong>CNPJ / CPF:</strong> ${sCnpj || '___________________________________'}</p>
          <p class="pfield"><strong>Endereço:</strong> ${sEndereco || '______________________________________'}</p>
          <p class="pfield"><strong>Cidade / UF:</strong> ${sCidade || '_______________________'} / ${sUF || '___'}</p>
          <p class="pfield"><strong>Contato:</strong> ${sTelefone || '_______________________'} · ${sContato || '_______________________________'}</p>
          <p class="pfield"><strong>Representante:</strong> ${sResponsavel || '______________________________'} · CPF ${sCpfResponsavel || '___________________'}</p>
        </div>
      </div>
    </div>

    <div class="clauses-label">Cláusulas Contratuais</div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">1</div>
        <div class="clause-title">Do Objeto</div>
      </div>
      <p>O presente instrumento tem por objeto a prestação de serviços de tecnologia pela CONTRATADA
      à CONTRATANTE, consistindo no licenciamento de uso do sistema de Ponto de Venda (PDV)
      <strong>Restaurante PDV</strong>, na modalidade <em>Software as a Service</em> (SaaS), plano
      <strong>${sPlano}</strong>, compreendendo:</p>
      <ol>
        <li>Acesso ao sistema via navegador web, com suporte a múltiplos dispositivos;</li>
        <li>Painel administrativo para gestão de produtos, mesas, pedidos e caixa;</li>
        <li>Atualizações de versão disponibilizadas automaticamente durante a vigência;</li>
        <li>Suporte técnico nos canais e horários definidos na Cláusula 4ª;</li>
        <li>Armazenamento dos dados do CONTRATANTE em ambiente seguro com backups periódicos.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">2</div>
        <div class="clause-title">Da Vigência</div>
      </div>
      <p>O presente contrato vigorará ${vigencia}, renovando-se automaticamente por períodos sucessivos de
      ${cicloExtMap[ciclo] || '30 (trinta) dias'}, salvo notificação de não renovação por qualquer das partes,
      realizada com antecedência mínima de 30 (trinta) dias antes do término do período vigente,
      por e-mail ou notificação escrita.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">3</div>
        <div class="clause-title">Do Valor e Forma de Pagamento</div>
      </div>
      <p>Pela prestação dos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor de
      <strong>${valor}</strong> por ciclo <strong>${cicloMap[ciclo] || ciclo}</strong>, com vencimento no dia
      <strong>10 (dez)</strong> de cada período de referência.</p>
      <p>São aceitos os seguintes meios de pagamento: PIX, transferência bancária (TED/DOC) ou boleto bancário.</p>
      <p class="paragrafo">O não pagamento até a data de vencimento acarretará multa moratória de 2% (dois por cento)
      sobre o valor em aberto, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die,
      além de correção monetária pelo IGPM/FGV, sem prejuízo da suspensão imediata do acesso ao sistema após
      10 (dez) dias de inadimplência.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">4</div>
        <div class="clause-title">Das Obrigações da Contratada</div>
      </div>
      <p>Compete à CONTRATADA:</p>
      <ol>
        <li>Garantir a disponibilidade do sistema com SLA mínimo de 99% (noventa e nove por cento) ao mês,
        excluídas janelas de manutenção programada comunicadas com antecedência;</li>
        <li>Realizar backups automáticos dos dados da CONTRATANTE com frequência mínima diária;</li>
        <li>Prestar suporte técnico de segunda a sexta-feira, das 08h às 18h (horário de Brasília),
        por meio de e-mail (${CONTRATADA.email}) e WhatsApp (${CONTRATADA.telefone});</li>
        <li>Comunicar à CONTRATANTE, com antecedência mínima de 48 (quarenta e oito) horas, as
        manutenções programadas que impliquem indisponibilidade do sistema;</li>
        <li>Manter a confidencialidade dos dados da CONTRATANTE, não os compartilhando com terceiros,
        salvo por determinação legal ou judicial.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">5</div>
        <div class="clause-title">Das Obrigações da Contratante</div>
      </div>
      <p>Compete à CONTRATANTE:</p>
      <ol>
        <li>Manter em sigilo as credenciais de acesso ao sistema, sendo integralmente responsável
        por uso indevido decorrente de compartilhamento não autorizado;</li>
        <li>Efetuar os pagamentos nas datas e condições acordadas neste instrumento;</li>
        <li>Utilizar o sistema exclusivamente para fins lícitos, em conformidade com a legislação
        brasileira e com os termos deste contrato;</li>
        <li>Notificar a CONTRATADA, imediatamente, sobre qualquer suspeita de violação de segurança,
        acesso não autorizado ou uso indevido do sistema;</li>
        <li>Manter seus dados cadastrais atualizados junto à CONTRATADA.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">6</div>
        <div class="clause-title">Da Propriedade Intelectual</div>
      </div>
      <p>O sistema <strong>Restaurante PDV</strong> e todos os seus componentes — incluindo código-fonte,
      interfaces, algoritmos, documentação e marca — são de propriedade exclusiva da CONTRATADA, protegidos
      pela Lei nº 9.609/1998 (Lei de Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).</p>
      <p class="paragrafo">Este contrato confere à CONTRATANTE licença de uso não exclusiva, intransferível
      e revogável do software, pelo período de vigência contratual. Não implica cessão, transferência ou
      sublicenciamento de quaisquer direitos de propriedade intelectual.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">7</div>
        <div class="clause-title">Da Confidencialidade e Proteção de Dados (LGPD)</div>
      </div>
      <p>As partes comprometem-se a tratar os dados pessoais eventualmente compartilhados em estrita
      conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD),
      adotando medidas técnicas e organizacionais adequadas para proteger as informações contra
      acesso não autorizado, destruição, perda, alteração ou divulgação indevida.</p>
      <p>A CONTRATADA atuará como <em>operadora</em> dos dados inseridos pela CONTRATANTE no sistema,
      processando-os exclusivamente para as finalidades previstas neste contrato. A CONTRATANTE,
      na qualidade de <em>controladora</em>, é responsável pela legalidade do tratamento de dados
      de seus clientes e colaboradores dentro do sistema.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">8</div>
        <div class="clause-title">Da Limitação de Responsabilidade</div>
      </div>
      <p>A CONTRATADA não será responsabilizada por danos indiretos, lucros cessantes ou perda de
      dados decorrentes de:</p>
      <ol>
        <li>Uso inadequado do sistema pela CONTRATANTE ou por terceiros com acesso autorizado por ela;</li>
        <li>Falhas de infraestrutura de terceiros (internet, energia elétrica, provedores de nuvem);</li>
        <li>Eventos de força maior ou caso fortuito, conforme o art. 393 do Código Civil Brasileiro;</li>
        <li>Manutenções programadas devidamente comunicadas.</li>
      </ol>
      <p class="paragrafo">Em qualquer hipótese, a responsabilidade máxima da CONTRATADA fica limitada
      ao valor pago pela CONTRATANTE nos últimos 3 (três) meses de vigência do contrato.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">9</div>
        <div class="clause-title">Da Rescisão</div>
      </div>
      <p>Este contrato poderá ser rescindido:</p>
      <ol>
        <li><strong>Por qualquer das partes</strong>, mediante notificação escrita com antecedência
        mínima de 30 (trinta) dias, sem ônus ou penalidades;</li>
        <li><strong>Por inadimplência</strong> da CONTRATANTE, após decorridos 10 (dez) dias do
        vencimento sem pagamento, independentemente de notificação prévia, não gerando direito
        a restituição de valores já pagos;</li>
        <li><strong>Por descumprimento contratual</strong> de qualquer das partes, após notificação
        e prazo de 5 (cinco) dias úteis para regularização.</li>
      </ol>
      <p class="paragrafo">Rescindido o contrato, a CONTRATADA manterá os dados da CONTRATANTE
      disponíveis para exportação por 30 (trinta) dias, após os quais poderão ser definitivamente
      excluídos.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">10</div>
        <div class="clause-title">Das Disposições Gerais</div>
      </div>
      <ol>
        <li>Este contrato constitui o acordo integral entre as partes, substituindo quaisquer
        entendimentos anteriores sobre o mesmo objeto;</li>
        <li>Qualquer alteração deste instrumento somente terá validade se formalizada por escrito
        e assinada por ambas as partes;</li>
        <li>A tolerância de uma das partes em relação ao descumprimento de qualquer cláusula não
        constituirá novação ou renúncia ao direito de exigi-la futuramente;</li>
        <li>Caso qualquer disposição deste contrato seja considerada inválida, as demais permanecerão
        em pleno vigor.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">11</div>
        <div class="clause-title">Do Foro</div>
      </div>
      <p>Fica eleito o foro da Comarca de <strong>${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}</strong>
      para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer
      outro, por mais privilegiado que seja, ressalvados os casos em que a legislação imponha foro
      diverso de forma imperativa.</p>
    </div>

    ${sObs ? `<div class="notes-box"><strong>Condições específicas / Observações:</strong><br>${sObs}</div>` : ''}

    <div class="sig-section">
      <p class="sig-city">${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}, _______ de __________________ de _______</p>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${sNome}</div>
          <div class="sig-role">CONTRATANTE</div>
        </div>
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${CONTRATADA.representante}</div>
          <div class="sig-role">CONTRATADA — ${CONTRATADA.cargoRepresentante}</div>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="witness-label">Testemunhas:</div>
        <div class="witness-grid">
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span><span class="footer-brand">Restaurante PDV</span> · ${CONTRATADA.razaoSocial} · CNPJ ${CONTRATADA.cnpj}</span>
    <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${sNome} · Plano ${sPlano}</span>
  </div>

</div>
</body>
</html>`

  const janela = window.open('', '_blank')
  if (!janela) { showToast('error', 'Permita popups para gerar o contrato'); return null }
  janela.document.write(html)
  janela.document.close()
  return janela
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
  carregarPlanos()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
