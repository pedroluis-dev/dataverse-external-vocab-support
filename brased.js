console.log("[BRASED-CVOC] Autocomplete Estilo PrimeFaces Global (Sem Cortes) carregado.");

(function($) {
    $(document).ready(function() {
        attachPrimeFacesAutocomplete();
    });

    $(document).on('pfAjaxComplete', function() {
        attachPrimeFacesAutocomplete();
    });

    function attachPrimeFacesAutocomplete() {
        const $inputs = $('input[data-cvoc-managedfields*="keywordValue"], input[data-cvoc-managed-field="keywordValue"]');
        
        $inputs.each(function() {
            const $input = $(this);
            
            if ($input.data('brased-pf-active')) return;
            $input.data('brased-pf-active', true);

            $input.attr('autocomplete', 'off');

            const inputId = $input.attr('id');
            const dropdownId = "pf-dropdown-" + inputId.replace(/:/g, "-");

            let typingTimer;
            const typingDelay = 400;

            $input.on('input', function() {
                clearTimeout(typingTimer);
                const searchTerm = $input.val().trim();

                if (searchTerm.length >= 3) {
                    typingTimer = setTimeout(function() {
                        fetchSuggestionsPF(searchTerm, $input, dropdownId);
                    }, typingDelay);
                } else {
                    removePFDropdown(dropdownId);
                }
            });

            // Reposiciona o dropdown dinamicamente caso o usuário redimensione a tela do navegador
            $(window).on('resize scroll', function() {
                const $dropdown = $(`#${dropdownId}`);
                if ($dropdown.length > 0) {
                    const offset = $input.offset();
                    $dropdown.css({
                        "top": (offset.top + $input.outerHeight()) + "px",
                        "left": offset.left + "px"
                    });
                }
            });

            $(document).on('click', function(e) {
                if (!$(e.target).closest($input).length && !$(e.target).closest(`#${dropdownId}`).length) {
                    removePFDropdown(dropdownId);
                }
            });

            $input.on('keydown', function(e) {
                if (e.key === "Escape") {
                    removePFDropdown(dropdownId);
                }
            });
        });
    }

    function fetchSuggestionsPF(term, $input, dropdownId) {
        const url = `/scripts/busca-brased.php?arg=${encodeURIComponent(term)}`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Erro na ponte PHP: ${response.status}`);
                return response.text();
            })
            .then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                const terms = xmlDoc.getElementsByTagName("term");
                
                if (terms.length > 0) {
                    renderPrimeFacesDropdown(terms, $input, dropdownId);
                } else {
                    removePFDropdown(dropdownId);
                }
            })
            .catch(error => {
                console.error("[BRASED-CVOC] Erro no autocomplete via PHP:", error);
            });
    }

    function renderPrimeFacesDropdown(terms, $input, dropdownId) {
        removePFDropdown(dropdownId);

        // Calcula a coordenada exata do input em relação à tela inteira
        const offset = $input.offset();

        const $wrapper = $('<div class="ui-selectonemenu-items-wrapper"></div>');
        $wrapper.attr('id', dropdownId);
        
        $wrapper.css({
            "position": "absolute",
            "top": (offset.top + $input.outerHeight()) + "px", // Cola exatamente na borda inferior do input
            "left": offset.left + "px",                       // Alinha milimetricamente à esquerda do input
            "z-index": "999999",                              // Força ficar no topo absoluto sobrepondo qualquer elemento
            "max-height": "200px",
            "height": "auto",
            "overflow-y": "auto",
            "background": "#fff",
            "border": "1px solid #dcdcdc",
            "width": $input.outerWidth() + "px",
            "box-shadow": "0 4px 12px rgba(0,0,0,0.15)",
            "border-radius": "4px"
        });

        const $ul = $('<ul class="ui-selectonemenu-items ui-selectonemenu-list ui-widget-content ui-widget ui-corner-all ui-helper-reset" role="listbox"></ul>');

        for (let i = 0; i < terms.length; i++) {
            const stringNode = terms[i].getElementsByTagName("string")[0];
            if (stringNode) {
                const termText = stringNode.textContent.trim();
                
                const $li = $('<li class="ui-selectonemenu-item ui-selectonemenu-list-item ui-corner-all" role="option"></li>');
                $li.text(termText);
                $li.attr('data-label', termText);
                
                $li.css({
                    "padding": "6px 12px",
                    "cursor": "pointer",
                    "list-style": "none"
                });

                $li.on('mouseenter', function() {
                    $(this).addClass('ui-state-highlight').css({"background-color": "#e2e8f0", "color": "#000"});
                }).on('mouseleave', function() {
                    $(this).removeClass('ui-state-highlight').css({"background-color": "transparent", "color": "inherit"});
                });

                $li.on('click', function() {
                    $input.val(termText).trigger('change');
                    preencherMetadadosAdicionais($input, termText);
                    removePFDropdown(dropdownId);
                });

                $ul.append($li);
            }
        }

        $wrapper.append($ul);

        // ALTERAÇÃO CHAVE: Injeta diretamente na tag 'body' da página inteira para escapar do overflow do Dataverse
        $('body').append($wrapper);
    }

    function removePFDropdown(dropdownId) {
        $(`#${dropdownId}`).remove();
    }

    function preencherMetadadosAdicionais($inputField, termoSelecionado) {
        const termUri = `https://vocabularyserver.com/brased/index.php?_expressao_de_pesquisa=${encodeURIComponent(termoSelecionado)}&taskSearch=1`;
        const currentId = $inputField.attr('id');
        if (!currentId) return;

        const idParts = currentId.split(':');
        const posicaoDoIndice = idParts.length - 2;

        if (!isNaN(idParts[posicaoDoIndice])) {
            idParts[posicaoDoIndice] = 1;
            const termUriId = idParts.join(':');
            
            idParts[posicaoDoIndice] = 2;
            const vocabNameId = idParts.join(':');

            idParts[posicaoDoIndice] = 3;
            const vocabUrlId = idParts.join(':');

            const $uriField = $(document.getElementById(termUriId));
            if ($uriField.length > 0) {
                $uriField.val(termUri).trigger('change');
            } else {
                const prefixoBase = idParts.slice(0, posicaoDoIndice).join(':');
                $(`input[id^="${prefixoBase}:"][id$=":1:cvocInputText"]`).val(termUri).trigger('change');
            }

            const $vocabNameField = $(document.getElementById(vocabNameId)) || $(`input[id^="${prefixoBase}:"][id$=":2:cvocInputText"]`);
            if ($vocabNameField.length > 0) {
                $vocabNameField.val("Thesaurus Brasileiro da Educação").trigger('change');
            }

            const $vocabUrlField = $(document.getElementById(vocabUrlId)) || $(`input[id^="${prefixoBase}:"][id$=":3:cvocInputText"]`);
            if ($vocabUrlField.length > 0) {
                $vocabUrlField.val("https://brased.inep.gov.br/brased/termo-publico").trigger('change');
            }
        }
    }
})(window.jQuery);
