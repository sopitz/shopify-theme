/* Move existing editorial nodes into quiet sections. No fetched or copied text. */
(() => {
  const faqTitle = /^(häufige fragen|fragen\s*(?:und|&)?\s*antworten|faq)$/i;
  const normal = value => value.replace(/\s+/g, ' ').trim();

  function enhanceQuestions(body) {
    for (const paragraph of [...body.children]) {
      if (paragraph.tagName !== 'P') continue;
      const question = paragraph.firstElementChild;
      if (question?.tagName !== 'STRONG' || !normal(question.textContent).endsWith('?')) continue;
      const before = [...paragraph.childNodes].slice(0, [...paragraph.childNodes].indexOf(question));
      if (before.some(node => normal(node.textContent))) continue;
      const answerNodes = [...paragraph.childNodes].slice([...paragraph.childNodes].indexOf(question) + 1);
      if (!answerNodes.some(node => node.nodeType === 1 && node.tagName !== 'BR' || normal(node.textContent))) continue;
      const details = document.createElement('details');
      details.className = 'product-description-question';
      const summary = document.createElement('summary');
      summary.append(question);
      const answer = document.createElement('div');
      answer.className = 'product-description-answer';
      let hasAnswer = false;
      for (const node of answerNodes) {
        if (!hasAnswer && (node.nodeType === 3 && !normal(node.textContent) || node.nodeName === 'BR')) continue;
        hasAnswer = true;
        answer.append(node);
      }
      details.append(summary, answer);
      paragraph.replaceWith(details);
    }
  }

  function bind(scope = document) {
    scope.querySelectorAll('[data-native-product-description]').forEach(article => {
      if (article.dataset.editorialBound || ![...article.children].some(node => node.tagName === 'H2')) return;
      article.dataset.editorialBound = 'true';
      let body = null;
      let section = null;
      const nodes = [...article.childNodes];
      const intro = document.createElement('div');
      intro.className = 'product-description-intro';
      article.prepend(intro);
      for (const node of nodes) {
        if (node.nodeName === 'H2') {
          section = document.createElement('section');
          section.className = 'product-description-section';
          body = document.createElement('div');
          body.className = 'product-description-section-body';
          if (faqTitle.test(normal(node.textContent))) section.classList.add('product-description-section--faq');
          section.append(node, body);
          article.append(section);
        } else (body || intro).append(node);
      }
      article.querySelectorAll('.product-description-section--faq > .product-description-section-body').forEach(enhanceQuestions);
      if (!normal(intro.textContent) && intro.childElementCount === 0) intro.remove();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bind(), {once:true});
  else bind();
  document.addEventListener('shopify:section:load', event => bind(event.target));
})();
