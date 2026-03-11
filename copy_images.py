import os, shutil

SRC = 'New Menu Images'
DEST = 'uploads/products'

mapping = [
    # Pizza
    ('Pizza/01_MARGHERITA_design.jpg', 'pizzalemon_01_margherita.jpg'),
    ('Pizza/02_PROFUMATA_design.jpg', 'pizzalemon_02_profumata.jpg'),
    ('Pizza/03_FUNGHI_design.jpg', 'pizzalemon_03_funghi.jpg'),
    ('Pizza/04_SPINAT_design.jpg', 'pizzalemon_04_spinat.jpg'),
    ('Pizza/05_GORGONZOLA_design.jpg', 'pizzalemon_05_gorgonzola.jpg'),
    ('Pizza/06_PROSCIUTTO_design.jpg', 'pizzalemon_06_prosciutto.jpg'),
    ('Pizza/07_SALAMI_design.jpg', 'pizzalemon_07_salami.jpg'),
    ('Pizza/08_DIAVOLA_design.jpg', 'pizzalemon_08_diavola.jpg'),
    ('Pizza/09_ARRABBIATA_design.jpg', 'pizzalemon_09_arrabbiata.jpg'),
    ('Pizza/10_SICILIANA_design.jpg', 'pizzalemon_10_siciliana.jpg'),
    ('Pizza/11_PROSCIUTTO E FUNGHI_design.jpg', 'pizzalemon_11_prosciutto_e_funghi.jpg'),
    ('Pizza/12_HAWAII_design.jpg', 'pizzalemon_12_hawaii.jpg'),
    ('Pizza/13_TONNO_design.jpg', 'pizzalemon_13_tonno.jpg'),
    ('Pizza/14_PICCANTE_design.jpg', 'pizzalemon_14_piccante.jpg'),
    ('Pizza/15_RACLETTE_design.jpg', 'pizzalemon_15_raclette.jpg'),
    ('Pizza/16_FIORENTINA_design.jpg', 'pizzalemon_16_fiorentina.jpg'),
    ('Pizza/17_KEBAB PIZZA_design.jpg', 'pizzalemon_17_kebab_pizza.jpg'),
    ('Pizza/18_POULET_design.jpg', 'pizzalemon_18_poulet.jpg'),
    ('Pizza/19_CARBONARA_design.jpg', 'pizzalemon_19_carbonara.jpg'),
    ('Pizza/20_GAMBERETTI_design.jpg', 'pizzalemon_20_gamberetti.jpg'),
    ('Pizza/21_QUATTRO FORMAGGI_design.jpg', 'pizzalemon_21_quattro_formaggi.jpg'),
    ('Pizza/22_QUATTRO STAGIONI_design.jpg', 'pizzalemon_22_quattro_stagioni.jpg'),
    ('Pizza/23_FRUTTI DI MARE_design.jpg', 'pizzalemon_23_frutti_di_mare.jpg'),
    ('Pizza/24_VERDURA_design.jpg', 'pizzalemon_24_verdura.jpg'),
    ('Pizza/25_NAPOLI_design.jpg', 'pizzalemon_25_napoli.jpg'),
    ('Pizza/26_PIZZAIOLO_design.jpg', 'pizzalemon_26_pizzaiolo.jpg'),
    ('Pizza/27_A CASA_design.jpg', 'pizzalemon_27_a_casa.jpg'),
    ('Pizza/28_PORCINI_design.jpg', 'pizzalemon_28_porcini.jpg'),
    ('Pizza/29_SPEZIAL_design.jpg', 'pizzalemon_29_spezial.jpg'),
    ('Pizza/30_PADRONE_design.jpg', 'pizzalemon_30_padrone.jpg'),
    ('Pizza/31_SCHLOSS PIZZA_design.jpg', 'pizzalemon_31_schloss_pizza.jpg'),
    ('Pizza/32_ITALIANO_design.jpg', 'pizzalemon_32_italiano.jpg'),
    ('Pizza/33_AMERICANO_design.jpg', 'pizzalemon_33_americano.jpg'),
    ('Pizza/34_LEMON PIZZA_design.jpg', 'pizzalemon_34_lemon_pizza.jpg'),
    # Pide
    ('Pide/35_PIDE MIT KÄSE_design.jpg', 'pizzalemon_35_pide_mit_kaese.jpg'),
    ('Pide/36_PIDE MIT HACKFLEISCH_design.jpg', 'pizzalemon_36_pide_mit_hackfleisch.jpg'),
    ('Pide/37_PIDE KÄSE HACKFLEISCH_design.jpg', 'pizzalemon_37_pide_kaese_hackfleisch.jpg'),
    ('Pide/38_PIDE KÄSE SPINAT_design.jpg', 'pizzalemon_38_pide_kaese_spinat.jpg'),
    ('Pide/39_PIDE KÄSE EI_design.jpg', 'pizzalemon_39_pide_kaese_ei.jpg'),
    ('Pide/40_LEMON PIDE_design.jpg', 'pizzalemon_40_lemon_pide.jpg'),
    ('Pide/41_LEMON PIDE SPEZIAL_design.jpg', 'pizzalemon_41_lemon_pide_spezial.jpg'),
    ('Pide/42_PIDE MIT SUCUK_design.jpg', 'pizzalemon_42_pide_mit_sucuk.jpg'),
    ('Pide/43_PIDE MIT KEBABFLEISCH_design.jpg', 'pizzalemon_43_pide_mit_kebabfleisch.jpg'),
    # Lahmacun
    ('Lahmacun/44_LAHMACUN MIT SALAT_design.jpg', 'pizzalemon_44_lahmacun_mit_salat.jpg'),
    ('Lahmacun/45_LAHMACUN+SALAT+KEBAB_design.jpg', 'pizzalemon_45_lahmacun_salat_kebab.jpg'),
    # Tellergerichte
    ('Tellergerichte/46_DÖNER TELLER+POMMES_design.jpg', 'pizzalemon_46_doener_teller_pommes.jpg'),
    ('Tellergerichte/47_DÖNER TELLER+SALAT_design.jpg', 'pizzalemon_47_doener_teller_salat.jpg'),
    ('Tellergerichte/48_DÖNER TELLER KOMPLETT_design.jpg', 'pizzalemon_48_doener_teller_komplett.jpg'),
    ('Tellergerichte/49_CHICKEN NUGGETS 8STK_design.jpg', 'pizzalemon_49_chicken_nuggets_8stk.jpg'),
    ('Tellergerichte/50_POULETSCHNITZEL_design.jpg', 'pizzalemon_50_pouletschnitzel.jpg'),
    ('Tellergerichte/51_POULETFLÜGELI 12STK_design.jpg', 'pizzalemon_51_pouletfluegeli_12stk.jpg'),
    ('Tellergerichte/52_POULET KEBAB TELLER_design.jpg', 'pizzalemon_52_poulet_kebab_teller.jpg'),
    ('Tellergerichte/53_LAMM KEBAB TELLER_design.jpg', 'pizzalemon_53_lamm_kebab_teller.jpg'),
    ('Tellergerichte/54_KÖFTE TELLER_design.jpg', 'pizzalemon_54_koefte_teller.jpg'),
    ('Tellergerichte/55_CEVAPCICI TELLER_design.jpg', 'pizzalemon_55_cevapcici_teller.jpg'),
    ('Tellergerichte/56_FALAFEL TELLER_design.jpg', 'pizzalemon_56_falafel_teller.jpg'),
    ('Tellergerichte/57_POMMES_design.jpg', 'pizzalemon_57_pommes.jpg'),
    ('Tellergerichte/58_CORDON BLEU_design.jpg', 'pizzalemon_58_cordon_bleu.jpg'),
    # Fingerfood
    ('Fingerfood/59_DÖNER KEBAB TASCHE_design.jpg', 'pizzalemon_59_doener_kebab_tasche.jpg'),
    ('Fingerfood/60_DÜRÜM KEBAB_design.jpg', 'pizzalemon_60_dueruem_kebab.jpg'),
    ('Fingerfood/61_DÖNER BOX_design.jpg', 'pizzalemon_61_doener_box.jpg'),
    ('Fingerfood/62_FALAFEL TASCHENBROT_design.jpg', 'pizzalemon_62_falafel_taschenbrot.jpg'),
    ('Fingerfood/63_FALAFEL DÜRÜM_design.jpg', 'pizzalemon_63_falafel_dueruem.jpg'),
    ('Fingerfood/64_POULET PEPITO_design.jpg', 'pizzalemon_64_poulet_pepito.jpg'),
    ('Fingerfood/65_LAMM PEPITO_design.jpg', 'pizzalemon_65_lamm_pepito.jpg'),
    ('Fingerfood/66_HAMBURGER_design.jpg', 'pizzalemon_66_hamburger.jpg'),
    ('Fingerfood/67_LEMON BURGER_design.jpg', 'pizzalemon_67_lemon_burger.jpg'),
    ('Fingerfood/68_CHEESEBURGER_design.jpg', 'pizzalemon_68_cheeseburger.jpg'),
    ('Fingerfood/69_HAMBURGER RINDFLEISCH_design.jpg', 'pizzalemon_69_hamburger_rindfleisch.jpg'),
    ('Fingerfood/70_POULET KEBAB TASCHE_design.jpg', 'pizzalemon_70_poulet_kebab_tasche.jpg'),
    ('Fingerfood/71_POULET KEBAB FLADEN_design.jpg', 'pizzalemon_71_poulet_kebab_fladen.jpg'),
    ('Fingerfood/72_LAMM KEBAB TASCHE_design.jpg', 'pizzalemon_72_lamm_kebab_tasche.jpg'),
    ('Fingerfood/73_LAMM KEBAB FLADEN_design.jpg', 'pizzalemon_73_lamm_kebab_fladen.jpg'),
    ('Fingerfood/74_KÖFTE TASCHENBROT_design.jpg', 'pizzalemon_74_koefte_taschenbrot.jpg'),
    ('Fingerfood/75_CEVAPCICI TASCHENBROT_design.jpg', 'pizzalemon_75_cevapcici_taschenbrot.jpg'),
    ('Fingerfood/76_FALAFEL BOX_design.jpg', 'pizzalemon_76_falafel_box.jpg'),
    ('Fingerfood/77_CHICKEN NUGGETS BOX_design.jpg', 'pizzalemon_77_chicken_nuggets_box.jpg'),
    ('Fingerfood/78_KEBAB FLADEN+RACLETTE_design.jpg', 'pizzalemon_78_kebab_fladen_raclette.jpg'),
    ('Fingerfood/79_KEBAB TASCHE+RACLETTE_design.jpg', 'pizzalemon_79_kebab_tasche_raclette.jpg'),
    ('Fingerfood/80_KEBAB FLADEN+SPECK_design.jpg', 'pizzalemon_80_kebab_fladen_speck.jpg'),
    ('Fingerfood/81_KEBAB TASCHE+SPECK_design.jpg', 'pizzalemon_81_kebab_tasche_speck.jpg'),
    # Salat
    ('Salat/82_GRÜNER SALAT_design.jpg', 'pizzalemon_82_gruener_salat.jpg'),
    ('Salat/83_GEMISCHTER SALAT_design.jpg', 'pizzalemon_83_gemischter_salat.jpg'),
    ('Salat/84_GRIECHISCHER SALAT_design.jpg', 'pizzalemon_84_griechischer_salat.jpg'),
    ('Salat/85_LEMON SALAT_design.jpg', 'pizzalemon_85_lemon_salat.jpg'),
    ('Salat/86_THON SALAT_design.jpg', 'pizzalemon_86_thon_salat.jpg'),
    ('Salat/87_TOMATEN SALAT_design.jpg', 'pizzalemon_87_tomaten_salat.jpg'),
    ('Salat/88_TOMATEN MOZZARELLA_design.jpg', 'pizzalemon_88_tomaten_mozzarella.jpg'),
    ('Salat/89_KNOBLIBROT_design.jpg', 'pizzalemon_89_knoblibrot.jpg'),
    ('Salat/90_CREVETTENCOCKTAIL_design.jpg', 'pizzalemon_90_crevettencocktail.jpg'),
    # Dessert
    ('Dessert/91_TIRAMISU_design.jpg', 'pizzalemon_91_tiramisu.jpg'),
    ('Dessert/92_BAKLAVA_design.jpg', 'pizzalemon_92_baklava.jpg'),
    ('Dessert/93_MARLENKE_design.jpg', 'pizzalemon_93_marlenke.jpg'),
    ('Dessert/94_CHOCO-MOUSSE_design.jpg', 'pizzalemon_94_choco_mousse.jpg'),
    ('Dessert/95_MÖVENPICK GLACE_design.jpg', 'pizzalemon_95_moevenpick_glace.jpg'),
    # Getraenke
    ('Getränke/96_COCA-COLA_design.jpg', 'pizzalemon_96_coca_cola.jpg'),
    ('Getränke/97_FANTA_design.jpg', 'pizzalemon_97_fanta.jpg'),
    ('Getränke/98_EISTEE_design.jpg', 'pizzalemon_98_eistee.jpg'),
    ('Getränke/99_MINERALWASSER_design.jpg', 'pizzalemon_99_mineralwasser.jpg'),
    ('Getränke/100_ULUDAG GAZOZ_design.jpg', 'pizzalemon_100_uludag_gazoz.jpg'),
    ('Getränke/101_RIVELLA_design.jpg', 'pizzalemon_101_rivella.jpg'),
    ('Getränke/102_AYRAN_design.jpg', 'pizzalemon_102_ayran.jpg'),
    ('Getränke/103_RED BULL_design.jpg', 'pizzalemon_103_red_bull.jpg'),
    # Bier
    ('Bier/104_MÜLLERBRÄU_design.jpg', 'pizzalemon_104_muellerbräu.jpg'),
    ('Bier/105_FELDSCHLÖSSCHEN_design.jpg', 'pizzalemon_105_feldschlosschen.jpg'),
    # Alkohol
    ('Alkohol/106_ROTWEIN MERLOT_design.jpg', 'pizzalemon_106_rotwein_merlot.jpg'),
    ('Alkohol/107_WEISSWEIN_design.jpg', 'pizzalemon_107_weisswein.jpg'),
    ('Alkohol/108_WHISKY_design.jpg', 'pizzalemon_108_whisky.jpg'),
    ('Alkohol/109_VODKA_design.jpg', 'pizzalemon_109_vodka.jpg'),
    ('Alkohol/110_CHAMPAGNER_design.jpg', 'pizzalemon_110_champagner.jpg'),
    ('Alkohol/111_SMIRNOFF ICE_design.jpg', 'pizzalemon_111_smirnoff_ice.jpg'),
    # Calzone
    ('Calzone/112_CALZONE_design.jpg', 'pizzalemon_112_calzone.jpg'),
    ('Calzone/113_CALZONE KEBAB_design.jpg', 'pizzalemon_113_calzone_kebab.jpg'),
    ('Calzone/114_CALZONE VERDURA_design.jpg', 'pizzalemon_114_calzone_verdura.jpg'),
]

success = 0
fail = 0
for src_rel, dest_file in mapping:
    src = os.path.join(SRC, src_rel)
    dst = os.path.join(DEST, dest_file)
    try:
        shutil.copy2(src, dst)
        success += 1
    except Exception as e:
        print(f'FAILED: {src_rel} -> {e}')
        fail += 1

print(f'Copied: {success}, Failed: {fail}')
