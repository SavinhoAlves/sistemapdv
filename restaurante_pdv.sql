/*
 Navicat Premium Dump SQL

 Source Server         : PDV
 Source Server Type    : MySQL
 Source Server Version : 80046 (8.0.46)
 Source Host           : localhost:3306
 Source Schema         : restaurante_pdv

 Target Server Type    : MySQL
 Target Server Version : 80046 (8.0.46)
 File Encoding         : 65001

 Date: 28/07/2026 23:59:16
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for auditoria
-- ----------------------------
DROP TABLE IF EXISTS `auditoria`;
CREATE TABLE `auditoria`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NULL DEFAULT NULL,
  `acao` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `entidade` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `entidade_id` int NULL DEFAULT NULL,
  `detalhes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_auditoria_acao`(`acao` ASC) USING BTREE,
  INDEX `idx_auditoria_created`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of auditoria
-- ----------------------------
INSERT INTO `auditoria` VALUES (1, 5, 'caixa_sangria', 'caixa', 5, '{\"valor\":0.5,\"descricao\":\"teste auditoria\"}', '2026-07-05 02:47:08');
INSERT INTO `auditoria` VALUES (2, 5, 'caixa_fechar', 'caixa', 5, '{\"valor_fechamento\":372.4}', '2026-07-05 02:47:08');
INSERT INTO `auditoria` VALUES (3, 5, 'taxa_remover', 'pedido', 19, NULL, '2026-07-05 04:05:12');
INSERT INTO `auditoria` VALUES (4, 5, 'taxa_remover', 'pedido', 19, NULL, '2026-07-06 22:19:22');
INSERT INTO `auditoria` VALUES (5, 5, 'caixa_sangria', 'caixa', 5, '{\"valor\":50,\"descricao\":\"teste sangria\"}', '2026-07-07 00:58:05');
INSERT INTO `auditoria` VALUES (6, 5, 'caixa_estorno', 'pagamento', 7, '{\"movimento_id\":11,\"valor\":8,\"motivo\":\"teste estorno\"}', '2026-07-07 00:58:40');
INSERT INTO `auditoria` VALUES (7, 5, 'caixa_fechar', 'caixa', 5, '{\"valor_fechamento\":322.9,\"esperado_dinheiro\":72,\"valor_contado\":70,\"diferenca\":-2}', '2026-07-07 00:59:19');
INSERT INTO `auditoria` VALUES (8, 5, 'caixa_abrir', 'caixa', 6, '{\"valor_inicial\":100}', '2026-07-07 00:59:48');
INSERT INTO `auditoria` VALUES (9, 5, 'item_excluir', 'pedido_item', 4, '{\"pedido_id\":19,\"produto_id\":9,\"quantidade\":4}', '2026-07-07 06:47:36');
INSERT INTO `auditoria` VALUES (10, 5, 'item_excluir', 'pedido_item', 66, '{\"pedido_id\":19,\"produto_id\":9,\"quantidade\":1}', '2026-07-07 06:51:23');
INSERT INTO `auditoria` VALUES (11, 5, 'item_excluir', 'pedido_item', 65, '{\"pedido_id\":19,\"produto_id\":9,\"quantidade\":2}', '2026-07-07 06:52:30');
INSERT INTO `auditoria` VALUES (12, 2, 'taxa_remover', 'pedido', 37, NULL, '2026-07-11 01:44:56');
INSERT INTO `auditoria` VALUES (13, 2, 'taxa_remover', 'pedido', 37, NULL, '2026-07-11 22:53:41');
INSERT INTO `auditoria` VALUES (14, 2, 'taxa_remover', 'pedido', 37, NULL, '2026-07-11 22:53:43');
INSERT INTO `auditoria` VALUES (15, 2, 'item_decrementar', 'pedido_item', 71, '{\"pedido_id\":39,\"produto_id\":3,\"excluido\":false}', '2026-07-14 00:57:32');
INSERT INTO `auditoria` VALUES (16, 5, 'pedido_abater', 'pedido', 40, '{\"valor\":0.6000000000000001,\"motivo\":\"Desconto 5%\"}', '2026-07-21 22:48:38');
INSERT INTO `auditoria` VALUES (17, 5, 'pedido_abater', 'pedido', 40, '{\"valor\":7,\"motivo\":null}', '2026-07-21 22:48:45');
INSERT INTO `auditoria` VALUES (18, 5, 'item_excluir', 'pedido_item', 78, '{\"pedido_id\":43,\"produto_id\":4,\"quantidade\":1}', '2026-07-21 22:50:18');
INSERT INTO `auditoria` VALUES (19, 5, 'caixa_estorno', 'pagamento', 16, '{\"movimento_id\":22,\"valor\":4,\"motivo\":null}', '2026-07-21 22:52:31');

-- ----------------------------
-- Table structure for caixa
-- ----------------------------
DROP TABLE IF EXISTS `caixa`;
CREATE TABLE `caixa`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `funcionario_id` int NULL DEFAULT NULL,
  `valor_inicial` decimal(10, 2) NOT NULL,
  `valor_fechamento` decimal(10, 2) NULL DEFAULT NULL,
  `data_abertura` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `fechado_em` timestamp NULL DEFAULT NULL,
  `status` enum('aberto','fechado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'aberto',
  `valor_contado` decimal(10, 2) NULL DEFAULT NULL,
  `diferenca` decimal(10, 2) NULL DEFAULT NULL,
  `observacao_fechamento` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `fechado_por` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `caixa_ibfk_1`(`funcionario_id` ASC) USING BTREE,
  CONSTRAINT `caixa_ibfk_1` FOREIGN KEY (`funcionario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of caixa
-- ----------------------------
INSERT INTO `caixa` VALUES (5, 5, 100.00, 322.90, '2026-06-28 13:42:31', '2026-07-07 00:59:19', 'fechado', 70.00, -2.00, 'teste de fechamento', 5);
INSERT INTO `caixa` VALUES (6, 5, 100.00, NULL, '2026-07-07 00:59:48', NULL, 'aberto', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for categorias
-- ----------------------------
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `vai_cozinha` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `nome`(`nome` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of categorias
-- ----------------------------
INSERT INTO `categorias` VALUES (1, 'Comidas', '2026-06-27 14:57:58', 1);
INSERT INTO `categorias` VALUES (2, 'Bebidas', '2026-06-27 14:58:08', 0);
INSERT INTO `categorias` VALUES (3, 'Lanches', '2026-06-27 14:58:18', 1);

-- ----------------------------
-- Table structure for configuracoes
-- ----------------------------
DROP TABLE IF EXISTS `configuracoes`;
CREATE TABLE `configuracoes`  (
  `id` int NOT NULL DEFAULT 1,
  `nome_restaurante` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Restaurante PDV',
  `logo_base64` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `mensagem_ficha` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'Obrigado pela preferência!',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `impressora_largura` int NOT NULL DEFAULT 80,
  `impressora_copias` int NOT NULL DEFAULT 1,
  `impressora_auto_imprimir` tinyint(1) NOT NULL DEFAULT 0,
  `mp_ativado` tinyint(1) NULL DEFAULT 0,
  `mp_access_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `mp_device_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `impressora_tipo` enum('navegador','rede','windows') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'navegador',
  `impressora_host` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `impressora_porta` int NULL DEFAULT 9100,
  `taxa_servico_pct` decimal(5, 2) NOT NULL DEFAULT 10.00,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of configuracoes
-- ----------------------------
INSERT INTO `configuracoes` VALUES (1, 'Restaurante PDV', NULL, 'Obrigado pela preferencia!', '2026-07-14 01:42:35', 80, 1, 1, 0, NULL, NULL, 'windows', 'EPSON TM-T20 Receipt', 9100, 10.00);

-- ----------------------------
-- Table structure for estoque_movimentacoes
-- ----------------------------
DROP TABLE IF EXISTS `estoque_movimentacoes`;
CREATE TABLE `estoque_movimentacoes`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `produto_id` int NOT NULL,
  `tipo` enum('entrada','saida','ajuste','venda','cancelamento') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `quantidade` int NOT NULL,
  `estoque_resultante` int NULL DEFAULT NULL,
  `motivo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `usuario_id` int NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_estmov_produto`(`produto_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `fk_estmov_produto` FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 50 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of estoque_movimentacoes
-- ----------------------------
INSERT INTO `estoque_movimentacoes` VALUES (1, 1, 'entrada', 10, 26, 'Teste de reposicao', 5, '2026-07-07 00:12:31');
INSERT INTO `estoque_movimentacoes` VALUES (2, 1, 'saida', -3, 23, 'Teste de quebra', 5, '2026-07-07 00:12:31');
INSERT INTO `estoque_movimentacoes` VALUES (3, 1, 'ajuste', -7, 16, 'Volta ao valor original', 5, '2026-07-07 00:12:32');
INSERT INTO `estoque_movimentacoes` VALUES (4, 1, 'ajuste', -12, 4, NULL, 5, '2026-07-07 00:17:21');
INSERT INTO `estoque_movimentacoes` VALUES (5, 1, 'ajuste', 12, 16, 'Edição do produto', 5, '2026-07-07 00:18:13');
INSERT INTO `estoque_movimentacoes` VALUES (6, 1, 'entrada', 4, 20, NULL, 5, '2026-07-07 00:23:52');
INSERT INTO `estoque_movimentacoes` VALUES (7, 1, 'saida', -16, 4, NULL, 5, '2026-07-07 00:25:00');
INSERT INTO `estoque_movimentacoes` VALUES (8, 1, 'venda', -2, 2, 'Venda F1783396685228', 5, '2026-07-07 00:58:05');
INSERT INTO `estoque_movimentacoes` VALUES (9, 1, 'cancelamento', 2, 4, 'Estorno da venda · pedido #35', 5, '2026-07-07 00:58:40');
INSERT INTO `estoque_movimentacoes` VALUES (10, 1, 'venda', -1, 3, 'Pedido mesa #21', 5, '2026-07-07 06:44:36');
INSERT INTO `estoque_movimentacoes` VALUES (11, 9, 'venda', -1, 12, 'Pedido mesa #21', 5, '2026-07-07 06:47:34');
INSERT INTO `estoque_movimentacoes` VALUES (12, 9, 'cancelamento', 4, 16, 'Item excluído do pedido #19', 5, '2026-07-07 06:47:36');
INSERT INTO `estoque_movimentacoes` VALUES (13, 9, 'venda', -1, 15, 'Pedido mesa #21', 5, '2026-07-07 06:48:05');
INSERT INTO `estoque_movimentacoes` VALUES (14, 9, 'venda', -1, 14, 'Pedido mesa #21', 5, '2026-07-07 06:49:50');
INSERT INTO `estoque_movimentacoes` VALUES (15, 9, 'venda', -1, 13, 'Pedido mesa #21', 5, '2026-07-07 06:51:22');
INSERT INTO `estoque_movimentacoes` VALUES (16, 9, 'cancelamento', 1, 14, 'Item excluído do pedido #19', 5, '2026-07-07 06:51:23');
INSERT INTO `estoque_movimentacoes` VALUES (17, 9, 'cancelamento', 2, 16, 'Item excluído do pedido #19', 5, '2026-07-07 06:52:30');
INSERT INTO `estoque_movimentacoes` VALUES (18, 9, 'venda', -3, 13, 'Pedido mesa #21', 5, '2026-07-07 06:52:30');
INSERT INTO `estoque_movimentacoes` VALUES (19, 1, 'venda', -3, 0, 'Venda F1783740248043', 2, '2026-07-11 00:24:08');
INSERT INTO `estoque_movimentacoes` VALUES (20, 4, 'venda', -1, 34, 'Pedido mesa #25', 2, '2026-07-11 01:44:50');
INSERT INTO `estoque_movimentacoes` VALUES (21, 9, 'venda', -1, 12, 'Venda F1783829417145', 5, '2026-07-12 01:10:17');
INSERT INTO `estoque_movimentacoes` VALUES (22, 4, 'venda', -1, 33, 'Pedido mesa #25', 2, '2026-07-14 00:32:02');
INSERT INTO `estoque_movimentacoes` VALUES (23, 4, 'venda', -1, 32, 'Pedido mesa #25', 2, '2026-07-14 00:32:22');
INSERT INTO `estoque_movimentacoes` VALUES (24, 4, 'venda', -1, 31, 'Pedido mesa #25', 2, '2026-07-14 00:36:51');
INSERT INTO `estoque_movimentacoes` VALUES (25, 3, 'venda', -1, 28, 'Pedido mesa #26', 2, '2026-07-14 00:53:29');
INSERT INTO `estoque_movimentacoes` VALUES (26, 5, 'venda', -1, 95, 'Pedido mesa #26', 2, '2026-07-14 00:56:42');
INSERT INTO `estoque_movimentacoes` VALUES (27, 2, 'venda', -1, 88, 'Pedido mesa #26', 2, '2026-07-14 00:56:44');
INSERT INTO `estoque_movimentacoes` VALUES (28, 3, 'venda', -1, 27, 'Pedido mesa #26', 2, '2026-07-14 00:57:01');
INSERT INTO `estoque_movimentacoes` VALUES (29, 3, 'cancelamento', 1, 28, 'Item removido do pedido #39', 2, '2026-07-14 00:57:32');
INSERT INTO `estoque_movimentacoes` VALUES (30, 3, 'venda', -1, 27, 'Pedido mesa #26', 2, '2026-07-14 00:58:08');
INSERT INTO `estoque_movimentacoes` VALUES (31, 1, 'entrada', 50, 50, 'Reposição de estoque', 5, '2026-07-14 22:39:22');
INSERT INTO `estoque_movimentacoes` VALUES (32, 1, 'venda', -1, 49, 'Pedido mesa #29', 5, '2026-07-21 22:48:25');
INSERT INTO `estoque_movimentacoes` VALUES (33, 1, 'venda', -1, 48, 'Pedido mesa #29', 5, '2026-07-21 22:48:27');
INSERT INTO `estoque_movimentacoes` VALUES (34, 1, 'venda', -1, 47, 'Pedido mesa #29', 5, '2026-07-21 22:48:29');
INSERT INTO `estoque_movimentacoes` VALUES (35, 9, 'venda', -3, 9, 'Venda F1784684962739', 5, '2026-07-21 22:49:22');
INSERT INTO `estoque_movimentacoes` VALUES (36, 1, 'venda', -1, 46, 'Venda F1784684989949', 5, '2026-07-21 22:49:49');
INSERT INTO `estoque_movimentacoes` VALUES (37, 1, 'venda', -1, 45, 'Pedido mesa #33', 5, '2026-07-21 22:50:13');
INSERT INTO `estoque_movimentacoes` VALUES (38, 4, 'venda', -1, 30, 'Pedido mesa #33', 5, '2026-07-21 22:50:15');
INSERT INTO `estoque_movimentacoes` VALUES (39, 4, 'cancelamento', 1, 31, 'Item excluído do pedido #43', 5, '2026-07-21 22:50:18');
INSERT INTO `estoque_movimentacoes` VALUES (40, 5, 'venda', -1, 94, 'Pedido mesa #33', 5, '2026-07-21 22:50:19');
INSERT INTO `estoque_movimentacoes` VALUES (41, 9, 'venda', -1, 8, 'Pedido mesa #33', 5, '2026-07-21 22:50:21');
INSERT INTO `estoque_movimentacoes` VALUES (42, 2, 'venda', -1, 87, 'Pedido mesa #33', 5, '2026-07-21 22:50:24');
INSERT INTO `estoque_movimentacoes` VALUES (43, 2, 'venda', -1, 86, 'Pedido mesa #33', 5, '2026-07-21 22:50:27');
INSERT INTO `estoque_movimentacoes` VALUES (44, 10, 'venda', -1, 75, 'Pedido mesa #33', 5, '2026-07-21 22:50:32');
INSERT INTO `estoque_movimentacoes` VALUES (45, 2, 'venda', -1, 85, 'Pedido mesa #33', 5, '2026-07-21 22:50:38');
INSERT INTO `estoque_movimentacoes` VALUES (46, 1, 'entrada', 5, 50, NULL, 5, '2026-07-21 22:50:55');
INSERT INTO `estoque_movimentacoes` VALUES (47, 1, 'saida', -5, 45, 'Vencido', 5, '2026-07-21 22:51:10');
INSERT INTO `estoque_movimentacoes` VALUES (48, 1, 'ajuste', 5, 50, NULL, 5, '2026-07-21 22:51:17');
INSERT INTO `estoque_movimentacoes` VALUES (49, 1, 'cancelamento', 1, 51, 'Estorno da venda · pedido #42', 5, '2026-07-21 22:52:31');

-- ----------------------------
-- Table structure for mesas
-- ----------------------------
DROP TABLE IF EXISTS `mesas`;
CREATE TABLE `mesas`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_mesa` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `cliente` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `capacidade` int NULL DEFAULT 4,
  `status` enum('aberta','fechada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aberta',
  `garcom_id` int NULL DEFAULT NULL,
  `caixa_id` int NULL DEFAULT NULL,
  `data_abertura` datetime NULL DEFAULT NULL,
  `data_fechamento` datetime NULL DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_mesas_garcom`(`garcom_id` ASC) USING BTREE,
  CONSTRAINT `fk_mesas_garcom` FOREIGN KEY (`garcom_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mesas
-- ----------------------------
INSERT INTO `mesas` VALUES (13, '1', NULL, 4, 'fechada', 2, NULL, '2026-05-02 15:49:53', '2026-06-27 17:48:32', '2026-05-02 15:49:53', '2026-06-27 17:48:32');
INSERT INTO `mesas` VALUES (14, '2', NULL, 4, 'fechada', 3, NULL, '2026-05-02 15:53:05', '2026-06-27 18:05:10', '2026-05-02 15:53:05', '2026-06-27 18:05:10');
INSERT INTO `mesas` VALUES (15, '3', NULL, 4, 'fechada', 4, NULL, '2026-05-02 15:56:01', '2026-06-27 18:12:49', '2026-05-15 14:16:45', '2026-06-27 18:12:49');
INSERT INTO `mesas` VALUES (16, '4', NULL, 4, 'fechada', 5, NULL, '2026-05-15 14:42:25', '2026-05-19 09:01:36', '2026-05-15 14:42:25', '2026-05-21 11:01:59');
INSERT INTO `mesas` VALUES (17, NULL, 'Appolo', 4, 'fechada', 5, NULL, '2026-06-27 18:15:31', '2026-06-27 18:16:14', '2026-06-27 18:15:31', '2026-06-27 18:16:14');
INSERT INTO `mesas` VALUES (18, NULL, 'Appolo', 4, 'fechada', 5, NULL, '2026-06-27 18:17:12', '2026-06-27 18:17:31', '2026-06-27 18:17:12', '2026-06-27 18:17:31');
INSERT INTO `mesas` VALUES (19, NULL, 'Sávio', 4, 'fechada', 5, 3, '2026-06-27 18:21:17', '2026-06-27 18:22:30', '2026-06-27 18:21:17', '2026-06-27 18:22:30');
INSERT INTO `mesas` VALUES (20, NULL, 'Appolo', 4, 'fechada', 2, 5, '2026-06-28 13:43:47', '2026-06-28 13:45:42', '2026-06-28 13:43:47', '2026-06-28 13:45:42');
INSERT INTO `mesas` VALUES (21, NULL, 'Appolo', 4, 'fechada', 2, 5, '2026-06-28 20:07:16', '2026-07-10 22:37:29', '2026-06-28 20:07:16', '2026-07-10 22:37:29');
INSERT INTO `mesas` VALUES (22, 'Mesa 22', 'Sávio', 4, 'fechada', 3, 5, '2026-06-28 20:31:41', '2026-07-10 23:58:51', '2026-06-28 20:31:41', '2026-07-10 23:58:51');
INSERT INTO `mesas` VALUES (25, 'Mesa 25', 'Teste', 4, 'fechada', 2, 6, '2026-07-11 01:37:46', '2026-07-14 01:14:30', '2026-07-11 01:37:46', '2026-07-14 01:14:30');
INSERT INTO `mesas` VALUES (26, 'Mesa 26', 'Mesa IPhone Savio', 4, 'fechada', 2, 6, '2026-07-14 00:53:02', '2026-07-14 01:14:36', '2026-07-14 00:53:02', '2026-07-14 01:14:36');
INSERT INTO `mesas` VALUES (27, 'Mesa 27', 'Teste Socket', 4, 'fechada', 5, NULL, '2026-07-14 01:00:57', '2026-07-14 01:03:50', '2026-07-14 01:00:57', '2026-07-14 01:03:50');
INSERT INTO `mesas` VALUES (28, 'Mesa 28', 'Teste Socket 2', 4, 'fechada', 5, NULL, '2026-07-14 01:03:31', '2026-07-14 01:03:50', '2026-07-14 01:03:31', '2026-07-14 01:03:50');
INSERT INTO `mesas` VALUES (29, 'Mesa 29', 'Teste tempo real', 4, 'fechada', 5, 6, '2026-07-14 01:07:10', '2026-07-21 22:49:04', '2026-07-14 01:07:10', '2026-07-21 22:49:04');
INSERT INTO `mesas` VALUES (30, 'Mesa 30', 'Teste tempo real', 4, 'aberta', 2, 6, '2026-07-14 01:11:30', NULL, '2026-07-14 01:11:30', '2026-07-14 01:11:30');
INSERT INTO `mesas` VALUES (31, 'Mesa 31', 'Teste tempo real 1', 4, 'aberta', 2, 6, '2026-07-14 01:11:59', NULL, '2026-07-14 01:11:59', '2026-07-14 01:11:59');
INSERT INTO `mesas` VALUES (32, 'Mesa 32', 'Teste Verificacao', 4, 'fechada', 2, NULL, '2026-07-14 12:49:19', '2026-07-14 12:49:42', '2026-07-14 12:49:19', '2026-07-14 12:49:42');
INSERT INTO `mesas` VALUES (33, 'Mesa 33', 'Teste', 4, 'aberta', 5, 6, '2026-07-21 22:50:05', NULL, '2026-07-21 22:50:05', '2026-07-21 22:50:05');

-- ----------------------------
-- Table structure for metodos_pagamento
-- ----------------------------
DROP TABLE IF EXISTS `metodos_pagamento`;
CREATE TABLE `metodos_pagamento`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `ativo` tinyint(1) NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of metodos_pagamento
-- ----------------------------
INSERT INTO `metodos_pagamento` VALUES (1, 'Dinheiro', 1);
INSERT INTO `metodos_pagamento` VALUES (2, 'PIX', 1);
INSERT INTO `metodos_pagamento` VALUES (3, 'Cartão de Crédito', 1);
INSERT INTO `metodos_pagamento` VALUES (4, 'Cartão de Débito', 1);
INSERT INTO `metodos_pagamento` VALUES (5, 'Vale Refeição', 1);

-- ----------------------------
-- Table structure for movimentos_caixa
-- ----------------------------
DROP TABLE IF EXISTS `movimentos_caixa`;
CREATE TABLE `movimentos_caixa`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `caixa_id` int NOT NULL,
  `tipo` enum('pagamento','suprimento','sangria','estorno') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(10, 2) NOT NULL,
  `descricao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usuario_id` int NULL DEFAULT NULL,
  `pagamento_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `caixa_id`(`caixa_id` ASC) USING BTREE,
  INDEX `fk_mov_caixa_user`(`usuario_id` ASC) USING BTREE,
  CONSTRAINT `fk_mov_caixa_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `movimentos_caixa_ibfk_1` FOREIGN KEY (`caixa_id`) REFERENCES `caixa` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 24 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of movimentos_caixa
-- ----------------------------
INSERT INTO `movimentos_caixa` VALUES (3, 5, 'pagamento', 58.00, 'Pagamento mesa #20 — pedido #8', '2026-06-28 13:45:42', NULL, NULL);
INSERT INTO `movimentos_caixa` VALUES (4, 5, 'pagamento', 128.90, 'PIX · F1782688625807 · 1x Água Mineral, 1x Batata Frita, 1x Cerveja Lata, 1x Cerveja Long Neck, 1x Espetinho Carne, 1x Espetinho Linguiça, 1x Espetinho Frango, 1x Hambúrguer, 1x Hambúrguer Gourmet, 1x Refrigerante Lata', '2026-06-28 20:17:05', 3, NULL);
INSERT INTO `movimentos_caixa` VALUES (5, 5, 'pagamento', 25.00, 'PIX · F1782689128843 · 1x Água Mineral, 1x Batata Frita, 1x Refrigerante Lata', '2026-06-28 20:25:28', 3, NULL);
INSERT INTO `movimentos_caixa` VALUES (6, 5, 'pagamento', 39.00, 'PIX · F1782690580306 · 2x Água Mineral, 1x Batata Frita, 2x Cerveja Lata', '2026-06-28 20:49:40', 3, NULL);
INSERT INTO `movimentos_caixa` VALUES (7, 5, 'pagamento', 22.00, 'Dinheiro · F1782690911460 · 1x Água Mineral, 1x Cerveja Lata, 1x Cerveja Long Neck', '2026-06-28 20:55:11', 3, NULL);
INSERT INTO `movimentos_caixa` VALUES (11, 5, 'pagamento', 8.00, 'Dinheiro · F1783396685228 · 2x �gua Mineral', '2026-07-07 00:58:05', 5, 7);
INSERT INTO `movimentos_caixa` VALUES (12, 5, 'sangria', 50.00, 'teste sangria', '2026-07-07 00:58:05', 5, NULL);
INSERT INTO `movimentos_caixa` VALUES (13, 5, 'estorno', 8.00, 'Estorno · teste estorno · Dinheiro · F1783396685228 · 2x �gua Mineral', '2026-07-07 00:58:40', 5, 7);
INSERT INTO `movimentos_caixa` VALUES (14, 6, 'pagamento', 70.00, 'PIX · Mesa 21', '2026-07-10 22:37:29', 2, 8);
INSERT INTO `movimentos_caixa` VALUES (15, 6, 'pagamento', 14.00, 'PIX · Mesa 22', '2026-07-10 23:58:51', 5, 9);
INSERT INTO `movimentos_caixa` VALUES (16, 6, 'pagamento', 12.00, 'PIX · F1783740248043 · 3x Água Mineral', '2026-07-11 00:24:08', 2, 10);
INSERT INTO `movimentos_caixa` VALUES (17, 6, 'pagamento', 15.00, 'PIX · F1783829417145 · 1x Batata Frita', '2026-07-12 01:10:17', 5, 11);
INSERT INTO `movimentos_caixa` VALUES (18, 6, 'pagamento', 44.00, 'PIX · Mesa 25', '2026-07-14 01:14:30', 2, 12);
INSERT INTO `movimentos_caixa` VALUES (19, 6, 'pagamento', 29.00, 'PIX · Mesa 26', '2026-07-14 01:14:36', 2, 13);
INSERT INTO `movimentos_caixa` VALUES (20, 6, 'pagamento', 4.40, 'PIX · Mesa 29', '2026-07-21 22:49:04', 5, 14);
INSERT INTO `movimentos_caixa` VALUES (21, 6, 'pagamento', 45.00, 'PIX · F1784684962739 · 3x Batata Frita', '2026-07-21 22:49:22', 5, 15);
INSERT INTO `movimentos_caixa` VALUES (22, 6, 'pagamento', 4.00, 'PIX · F1784684989949 · 1x Água Mineral', '2026-07-21 22:49:49', 5, 16);
INSERT INTO `movimentos_caixa` VALUES (23, 6, 'estorno', 4.00, 'Estorno · PIX · F1784684989949 · 1x Água Mineral', '2026-07-21 22:52:31', 5, 16);

-- ----------------------------
-- Table structure for pagamentos
-- ----------------------------
DROP TABLE IF EXISTS `pagamentos`;
CREATE TABLE `pagamentos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `mesa_id` int NULL DEFAULT NULL,
  `pedido_id` int NULL DEFAULT NULL,
  `metodo_id` int NOT NULL,
  `valor` decimal(10, 2) NOT NULL,
  `troco` decimal(10, 2) NULL DEFAULT 0.00,
  `caixa_id` int NULL DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `status` enum('pendente','confirmado','estornado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'confirmado',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_pag_mesa`(`mesa_id` ASC) USING BTREE,
  INDEX `fk_pag_metodo`(`metodo_id` ASC) USING BTREE,
  INDEX `fk_pag_user`(`usuario_id` ASC) USING BTREE,
  CONSTRAINT `fk_pag_mesa` FOREIGN KEY (`mesa_id`) REFERENCES `mesas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pag_metodo` FOREIGN KEY (`metodo_id`) REFERENCES `metodos_pagamento` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pag_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of pagamentos
-- ----------------------------
INSERT INTO `pagamentos` VALUES (1, NULL, NULL, 2, 128.90, 0.00, 5, 3, 'confirmado', '2026-06-28 20:17:05');
INSERT INTO `pagamentos` VALUES (2, NULL, 29, 2, 25.00, 0.00, 5, 3, 'confirmado', '2026-06-28 20:25:28');
INSERT INTO `pagamentos` VALUES (3, NULL, 31, 2, 39.00, 0.00, 5, 3, 'confirmado', '2026-06-28 20:49:40');
INSERT INTO `pagamentos` VALUES (4, NULL, 32, 1, 22.00, 0.00, 5, 3, 'confirmado', '2026-06-28 20:55:11');
INSERT INTO `pagamentos` VALUES (7, NULL, 35, 1, 8.00, 2.00, 5, 5, 'estornado', '2026-07-07 00:58:05');
INSERT INTO `pagamentos` VALUES (8, 21, 19, 2, 70.00, 0.00, 6, 2, 'confirmado', '2026-07-10 22:37:29');
INSERT INTO `pagamentos` VALUES (9, 22, 30, 2, 14.00, 0.00, 6, 5, 'confirmado', '2026-07-10 23:58:51');
INSERT INTO `pagamentos` VALUES (10, NULL, 36, 2, 12.00, 0.00, 6, 2, 'confirmado', '2026-07-11 00:24:08');
INSERT INTO `pagamentos` VALUES (11, NULL, 38, 2, 15.00, 0.00, 6, 5, 'confirmado', '2026-07-12 01:10:17');
INSERT INTO `pagamentos` VALUES (12, 25, 37, 2, 44.00, 0.00, 6, 2, 'confirmado', '2026-07-14 01:14:30');
INSERT INTO `pagamentos` VALUES (13, 26, 39, 2, 29.00, 0.00, 6, 2, 'confirmado', '2026-07-14 01:14:36');
INSERT INTO `pagamentos` VALUES (14, 29, 40, 2, 4.40, 0.00, 6, 5, 'confirmado', '2026-07-21 22:49:04');
INSERT INTO `pagamentos` VALUES (15, NULL, 41, 2, 45.00, 0.00, 6, 5, 'confirmado', '2026-07-21 22:49:22');
INSERT INTO `pagamentos` VALUES (16, NULL, 42, 2, 4.00, 0.00, 6, 5, 'estornado', '2026-07-21 22:49:49');

-- ----------------------------
-- Table structure for pdv_config
-- ----------------------------
DROP TABLE IF EXISTS `pdv_config`;
CREATE TABLE `pdv_config`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `chave_ativacao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `status_licenca` enum('ativado','pendente','bloqueado') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'pendente',
  `data_ativacao` datetime NULL DEFAULT NULL,
  `data_vencimento` datetime NULL DEFAULT NULL,
  `ultima_verificacao` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `host_fingerprint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'ID único da máquina servidora',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of pdv_config
-- ----------------------------
INSERT INTO `pdv_config` VALUES (9, 'eyJjIjoiVGVzdGUiLCJkIjozMCwicyI6Im5vdmEyMDIwKiJ9', 'ativado', '2026-07-21 22:09:59', '2026-08-20 22:09:59', '2026-07-24 00:04:58', NULL);

-- ----------------------------
-- Table structure for pedido_abatimentos
-- ----------------------------
DROP TABLE IF EXISTS `pedido_abatimentos`;
CREATE TABLE `pedido_abatimentos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `valor` decimal(10, 2) NOT NULL,
  `motivo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_abat_pedido`(`pedido_id` ASC) USING BTREE,
  CONSTRAINT `fk_abat_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of pedido_abatimentos
-- ----------------------------
INSERT INTO `pedido_abatimentos` VALUES (1, 1, 10.00, NULL, '2026-06-27 16:45:55');
INSERT INTO `pedido_abatimentos` VALUES (2, 1, 10.40, NULL, '2026-06-27 16:49:02');
INSERT INTO `pedido_abatimentos` VALUES (3, 40, 0.60, 'Desconto 5%', '2026-07-21 22:48:38');
INSERT INTO `pedido_abatimentos` VALUES (4, 40, 7.00, NULL, '2026-07-21 22:48:45');

-- ----------------------------
-- Table structure for pedido_itens
-- ----------------------------
DROP TABLE IF EXISTS `pedido_itens`;
CREATE TABLE `pedido_itens`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `produto_id` int NOT NULL,
  `quantidade` int NOT NULL DEFAULT 1,
  `preco_unitario` decimal(10, 2) NOT NULL,
  `preco_total` decimal(10, 2) NOT NULL,
  `observacao` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` enum('pendente','preparando','pronto','entregue','cancelado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `pedido_id`(`pedido_id` ASC) USING BTREE,
  CONSTRAINT `pedido_itens_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 83 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of pedido_itens
-- ----------------------------
INSERT INTO `pedido_itens` VALUES (1, 19, 1, 2, 4.00, 8.00, NULL, 'pendente', '2026-06-28 20:08:36', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (2, 19, 4, 1, 10.00, 10.00, NULL, 'pendente', '2026-06-28 20:08:36', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (3, 19, 5, 1, 7.00, 7.00, NULL, 'pendente', '2026-06-28 20:08:36', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (50, 29, 1, 1, 4.00, 4.00, NULL, 'pronto', '2026-06-28 20:25:28', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (51, 29, 9, 1, 15.00, 15.00, NULL, 'pronto', '2026-06-28 20:25:28', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (52, 29, 2, 1, 6.00, 6.00, NULL, 'pronto', '2026-06-28 20:25:28', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (53, 30, 1, 1, 4.00, 4.00, NULL, 'pendente', '2026-06-28 20:31:53', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (54, 30, 8, 1, 10.00, 10.00, NULL, 'pendente', '2026-06-28 20:31:54', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (55, 31, 1, 2, 4.00, 8.00, NULL, 'pronto', '2026-06-28 20:49:40', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (56, 31, 9, 1, 15.00, 15.00, NULL, 'pronto', '2026-06-28 20:49:40', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (57, 31, 3, 2, 8.00, 16.00, NULL, 'pronto', '2026-06-28 20:49:40', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (58, 32, 1, 1, 4.00, 4.00, NULL, 'pronto', '2026-06-28 20:55:11', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (59, 32, 3, 1, 8.00, 8.00, NULL, 'pronto', '2026-06-28 20:55:11', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (60, 32, 4, 1, 10.00, 10.00, NULL, 'pronto', '2026-06-28 20:55:11', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (64, 35, 1, 2, 4.00, 8.00, NULL, 'pronto', '2026-07-07 00:58:05', '2026-07-07 06:47:17');
INSERT INTO `pedido_itens` VALUES (67, 19, 9, 3, 15.00, 45.00, NULL, 'pendente', '2026-07-07 06:52:30', '2026-07-07 06:52:30');
INSERT INTO `pedido_itens` VALUES (68, 36, 1, 3, 4.00, 12.00, NULL, 'pronto', '2026-07-11 00:24:08', '2026-07-11 00:24:08');
INSERT INTO `pedido_itens` VALUES (69, 37, 4, 4, 10.00, 40.00, NULL, 'pronto', '2026-07-11 01:44:50', '2026-07-14 00:36:51');
INSERT INTO `pedido_itens` VALUES (70, 38, 9, 1, 15.00, 15.00, NULL, 'pronto', '2026-07-12 01:10:17', '2026-07-12 01:10:17');
INSERT INTO `pedido_itens` VALUES (71, 39, 3, 2, 8.00, 16.00, NULL, 'pronto', '2026-07-14 00:53:29', '2026-07-14 00:58:08');
INSERT INTO `pedido_itens` VALUES (72, 39, 5, 1, 7.00, 7.00, NULL, 'pronto', '2026-07-14 00:56:42', '2026-07-14 00:56:42');
INSERT INTO `pedido_itens` VALUES (73, 39, 2, 1, 6.00, 6.00, NULL, 'pronto', '2026-07-14 00:56:44', '2026-07-14 00:56:44');
INSERT INTO `pedido_itens` VALUES (74, 40, 1, 3, 4.00, 12.00, NULL, 'pronto', '2026-07-21 22:48:25', '2026-07-21 22:48:29');
INSERT INTO `pedido_itens` VALUES (75, 41, 9, 3, 15.00, 45.00, NULL, 'pronto', '2026-07-21 22:49:22', '2026-07-21 22:49:22');
INSERT INTO `pedido_itens` VALUES (76, 42, 1, 1, 4.00, 4.00, NULL, 'pronto', '2026-07-21 22:49:49', '2026-07-21 22:49:49');
INSERT INTO `pedido_itens` VALUES (77, 43, 1, 1, 4.00, 4.00, NULL, 'pronto', '2026-07-21 22:50:13', '2026-07-21 22:50:13');
INSERT INTO `pedido_itens` VALUES (79, 43, 5, 1, 7.00, 7.00, NULL, 'pronto', '2026-07-21 22:50:19', '2026-07-21 22:50:19');
INSERT INTO `pedido_itens` VALUES (80, 43, 9, 1, 15.00, 15.00, NULL, 'entregue', '2026-07-21 22:50:21', '2026-07-21 22:52:56');
INSERT INTO `pedido_itens` VALUES (81, 43, 2, 3, 6.00, 18.00, NULL, 'pronto', '2026-07-21 22:50:24', '2026-07-21 22:50:38');
INSERT INTO `pedido_itens` VALUES (82, 43, 10, 1, 18.00, 18.00, NULL, 'pendente', '2026-07-21 22:50:32', '2026-07-21 22:50:32');

-- ----------------------------
-- Table structure for pedidos
-- ----------------------------
DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE `pedidos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `mesa_id` int NULL DEFAULT NULL,
  `garcom_id` int NULL DEFAULT NULL,
  `funcionario_id` int NULL DEFAULT NULL,
  `status` enum('aberto','preparando','pronto','entregue','fechado','cancelado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'aberto',
  `total` decimal(10, 2) NULL DEFAULT 0.00,
  `desconto` decimal(10, 2) NOT NULL DEFAULT 0.00,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `caixa_id` int NULL DEFAULT NULL,
  `taxa_pct` decimal(5, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `mesa_id`(`mesa_id` ASC) USING BTREE,
  INDEX `funcionario_id`(`funcionario_id` ASC) USING BTREE,
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`mesa_id`) REFERENCES `mesas` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `pedidos_ibfk_2` FOREIGN KEY (`funcionario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 44 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of pedidos
-- ----------------------------
INSERT INTO `pedidos` VALUES (1, 13, NULL, NULL, 'fechado', 150.40, 92.40, '2026-05-23 02:25:48', NULL, 0.00);
INSERT INTO `pedidos` VALUES (3, 14, 5, NULL, 'fechado', 14.00, 0.00, '2026-06-27 18:02:28', NULL, 0.00);
INSERT INTO `pedidos` VALUES (4, 15, 5, NULL, 'fechado', 46.00, 0.00, '2026-06-27 18:12:31', NULL, 0.00);
INSERT INTO `pedidos` VALUES (5, 17, 5, NULL, 'fechado', 14.00, 0.00, '2026-06-27 18:16:06', NULL, 0.00);
INSERT INTO `pedidos` VALUES (6, 18, 5, NULL, 'fechado', 34.00, 0.00, '2026-06-27 18:17:18', NULL, 0.00);
INSERT INTO `pedidos` VALUES (7, 19, 5, NULL, 'fechado', 37.00, 0.00, '2026-06-27 18:22:21', NULL, 0.00);
INSERT INTO `pedidos` VALUES (8, 20, 2, NULL, 'fechado', 58.00, 0.00, '2026-06-28 13:45:01', NULL, 0.00);
INSERT INTO `pedidos` VALUES (19, 21, 3, NULL, 'fechado', 70.00, 0.00, '2026-06-28 20:08:36', NULL, 0.00);
INSERT INTO `pedidos` VALUES (29, NULL, 3, NULL, 'fechado', 25.00, 0.00, '2026-06-28 20:25:28', NULL, 0.00);
INSERT INTO `pedidos` VALUES (30, 22, 3, NULL, 'fechado', 14.00, 0.00, '2026-06-28 20:31:53', NULL, 0.00);
INSERT INTO `pedidos` VALUES (31, NULL, 3, NULL, 'fechado', 39.00, 0.00, '2026-06-28 20:49:40', NULL, 0.00);
INSERT INTO `pedidos` VALUES (32, NULL, 3, NULL, 'fechado', 22.00, 0.00, '2026-06-28 20:55:11', NULL, 0.00);
INSERT INTO `pedidos` VALUES (35, NULL, 5, NULL, 'cancelado', 8.00, 0.00, '2026-07-07 00:58:05', NULL, 0.00);
INSERT INTO `pedidos` VALUES (36, NULL, 2, NULL, 'fechado', 12.00, 0.00, '2026-07-11 00:24:08', NULL, 0.00);
INSERT INTO `pedidos` VALUES (37, 25, 2, NULL, 'fechado', 40.00, 0.00, '2026-07-11 01:44:50', NULL, 10.00);
INSERT INTO `pedidos` VALUES (38, NULL, 5, NULL, 'fechado', 15.00, 0.00, '2026-07-12 01:10:17', NULL, 0.00);
INSERT INTO `pedidos` VALUES (39, 26, 2, NULL, 'fechado', 29.00, 0.00, '2026-07-14 00:53:29', NULL, 0.00);
INSERT INTO `pedidos` VALUES (40, 29, 5, NULL, 'fechado', 12.00, 7.60, '2026-07-21 22:48:25', NULL, 0.00);
INSERT INTO `pedidos` VALUES (41, NULL, 5, NULL, 'fechado', 45.00, 0.00, '2026-07-21 22:49:22', NULL, 0.00);
INSERT INTO `pedidos` VALUES (42, NULL, 5, NULL, 'cancelado', 4.00, 0.00, '2026-07-21 22:49:49', NULL, 0.00);
INSERT INTO `pedidos` VALUES (43, 33, 5, NULL, 'aberto', 62.00, 0.00, '2026-07-21 22:50:13', NULL, 0.00);

-- ----------------------------
-- Table structure for produtos
-- ----------------------------
DROP TABLE IF EXISTS `produtos`;
CREATE TABLE `produtos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `preco` decimal(10, 2) NOT NULL,
  `categoria` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `categoria_id` int NULL DEFAULT NULL,
  `ativo` tinyint(1) NULL DEFAULT 1,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estoque_atual` int NULL DEFAULT 0,
  `estoque_minimo` int NULL DEFAULT 5,
  `gerenciar_estoque` tinyint(1) NULL DEFAULT 0,
  `unidade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_produtos_categoria`(`categoria_id` ASC) USING BTREE,
  CONSTRAINT `fk_produtos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of produtos
-- ----------------------------
INSERT INTO `produtos` VALUES (1, 'Água Mineral', 4.00, 'bebidas', 2, 1, '2026-03-31 13:46:24', 51, 5, 1, NULL);
INSERT INTO `produtos` VALUES (2, 'Refrigerante Lata', 6.00, 'bebidas', 2, 1, '2026-03-31 13:46:24', 85, 5, 1, NULL);
INSERT INTO `produtos` VALUES (3, 'Cerveja Lata', 8.00, 'bebidas', 2, 1, '2026-03-31 13:46:24', 27, 5, 1, NULL);
INSERT INTO `produtos` VALUES (4, 'Cerveja Long Neck', 10.00, 'bebidas', 2, 1, '2026-03-31 13:46:24', 31, 5, 1, NULL);
INSERT INTO `produtos` VALUES (5, 'Suco Natural', 7.00, 'bebidas', 2, 1, '2026-03-31 13:46:24', 94, 5, 1, NULL);
INSERT INTO `produtos` VALUES (6, 'Espetinho Carne', 12.00, 'comida', 1, 1, '2026-03-31 13:46:24', 48, 5, 1, NULL);
INSERT INTO `produtos` VALUES (7, 'Espetinho Frango', 10.00, 'comida', 1, 1, '2026-03-31 13:46:24', 57, 5, 1, NULL);
INSERT INTO `produtos` VALUES (8, 'Espetinho Linguiça', 10.00, 'comida', 1, 1, '2026-03-31 13:46:24', 68, 5, 1, NULL);
INSERT INTO `produtos` VALUES (9, 'Batata Frita', 15.00, 'comida', 1, 1, '2026-03-31 13:46:24', 8, 5, 1, NULL);
INSERT INTO `produtos` VALUES (10, 'Hambúrguer', 18.00, 'comida', 3, 1, '2026-03-31 13:46:24', 75, 5, 1, NULL);
INSERT INTO `produtos` VALUES (11, 'Hambúrguer Gourmet', 35.90, 'Lanches', 3, 1, '2026-05-16 01:23:20', 20, 5, 1, NULL);
INSERT INTO `produtos` VALUES (12, 'Teste', 6.50, 'Comida', 1, 1, '2026-05-23 03:44:57', 149, 10, 1, NULL);

-- ----------------------------
-- Table structure for sync_config
-- ----------------------------
DROP TABLE IF EXISTS `sync_config`;
CREATE TABLE `sync_config`  (
  `id` int NOT NULL DEFAULT 1,
  `instalacao_uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `central_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `sync_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `venda_mobile_permitida` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_sync_em` datetime NULL DEFAULT NULL,
  `ultimo_sync_sucesso` tinyint(1) NULL DEFAULT NULL,
  `ultimo_sync_erro` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `licenca_bloqueada_remoto` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sync_config
-- ----------------------------
INSERT INTO `sync_config` VALUES (1, 'b784eeb2-4203-43d5-bdb8-fbc27f766679', NULL, NULL, 1, NULL, NULL, NULL, 0);

-- ----------------------------
-- Table structure for usuarios
-- ----------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cargo` enum('administrador','garcom','caixa','cozinha') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cartao_rfid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ativo` tinyint(1) NULL DEFAULT 1,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `senha_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ultimo_login` datetime NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE,
  UNIQUE INDEX `cartao_rfid`(`cartao_rfid` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of usuarios
-- ----------------------------
INSERT INTO `usuarios` VALUES (2, 'Garçom João', 'garcom', '0000295144', 1, '2026-03-31 13:46:12', 'garcom@pdv.com', '$2b$10$e95C51uWAirocQyjZHMMBuuCHF9cpGky6jgyApJKJcH.TFEwk/pGa', '2026-04-30 20:02:00', '2026-04-09 11:00:27');
INSERT INTO `usuarios` VALUES (3, 'Caixa Maria', 'caixa', NULL, 1, '2026-03-31 13:46:12', 'caixa@pdv.com', '$2b$10$nzs9JXb1gTSfgnVXkuc3x.BerUPP69XiUTMVENfK92OKWF8jBfDfW', '2026-04-09 13:59:01', '2026-04-09 11:00:27');
INSERT INTO `usuarios` VALUES (4, 'Cozinha Pedro', 'cozinha', NULL, 1, '2026-03-31 13:46:12', 'cozinha@pdv.com', '$2a$10$T/aZbSTeCnZUGf07BqzTQ.QTIlXD6B6uZkXOC318wJ/A/1h5bkcNW', NULL, '2026-04-09 11:00:27');
INSERT INTO `usuarios` VALUES (5, 'Administrador', 'administrador', '0008287013', 1, '2026-04-02 11:15:16', 'admin@pdv.com', '$2b$10$nzs9JXb1gTSfgnVXkuc3x.BerUPP69XiUTMVENfK92OKWF8jBfDfW', '2026-04-30 19:59:27', '2026-04-09 11:00:27');

SET FOREIGN_KEY_CHECKS = 1;
