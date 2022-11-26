---
---
let accounts = [];
let page = 1;
let prevData = null;
axios.defaults.baseURL = '{{ site.url }}';

if (location.hash) page = parseInt(location.hash.replace('#page-', ''));

const paginate = (items, page = 1, perPage = 10) => {
	const offset = perPage * (page - 1);
	const totalPages = Math.ceil(items.length / perPage);
	const paginatedItems = items.slice(offset, perPage * page);

	return {
		previousPage: page - 1 ? page - 1 : null,
		nextPage: (totalPages > page) ? page + 1 : null,
		total: items.length,
		totalPages: totalPages,
		items: paginatedItems
	};
};

const getData = list => {
	axios.get(`/assets/lists/${list}.json`)
	.then( resp => {
		accounts = resp.data;
		drawAccounts();
		drawPagination();
	});
}

const drawAccounts = () => {
	data = paginate(accounts, page, 10);
	const tpl = $('#account-tpl').html();
	const html = ejs.render(tpl, { items: data.items });
	$('#list').html(html)

	const from = (10 * (page -1 )) + 1;
	const to = (from + 9 <= data.total) ? from + 9 : data.total
	$('#total-pages').html(`View ${from} - ${to} of ${accounts.length} accounts`);
}

const drawPagination = () => {
	$('#pagination').empty();
	const totalPages = Math.ceil(accounts.length / 10);

	if (page > 1) {
		$('#pagination').append(`<a class="md:w-8 h-8 text-white flex items-center justify-center" href="#page-${page-1}">
			{% include icons/prev.svg %}
			<span class="md:hidden">Prev</span>
		</a>`);
	}

	for (i = 0; i < totalPages; i++) {
		if (page == i+1)
			$('#pagination').append(`<span class="rounded-full bg-gray-100 w-8 h-8 items-center justify-center hidden md:flex">${i+1}</span>`);
		else
			$('#pagination').append(`<a class="rounded-full text-white w-8 h-8 items-center justify-center hidden md:flex" href="#page-${i+1}">${i+1}</a>`);
	}

	if (page < totalPages) {
		$('#pagination').append(`<a class="text-white md:w-8 h-8 flex items-center justify-centerhref="#page-${page+1}">
					<span class="md:hidden">Next</span>
			{% include icons/next.svg %}
		</a>`);
	}
}

const clearSearch = () => {
	if (prevData) {
		accounts = prevData;
		prevData = null;
	}

	$('#list').show('grid');
	$('.clear-search').hide();
	$('.search-icon').show();
	location.hash = '';
	page = 1;
	window.scrollTo({ top: 0, behavior: 'smooth' });
	drawAccounts();
	drawPagination();
}

document.addEventListener("DOMContentLoaded", () => {
	$('#pagination').on('click', 'a', function(e) {
		if (! $(this).attr('href').startsWith('#page-')) return;

		page = parseInt($(this).attr('href').replace('#page-', ''));
		drawPagination();
		drawAccounts();
		window.scrollTo({ top: 0, behavior: 'smooth' })
	});

	$('.search').on('keyup', function() {
		$('#no-results').hide();
		$('#list').show('grid');
		const search = $(this).val().toLowerCase().trim();

		if (prevData) {
			accounts = prevData;
			prevData = null;
			drawAccounts();
			drawPagination();
		}

		if (search.length > 0) {
			$('.clear-search').show();
			$('.search-icon').hide();
		} else {
			$('.clear-search').hide();
			$('.search-icon').show();
		}

		if (search.length < 3) return;

		const results = accounts.filter( (data)=>{
			var regex = new RegExp(search, "i");
			return data.username.match(regex) || data.acct.match(regex)  || data.note.match(regex);
		});

		if (results.length > 0) {
			if (!prevData) prevData = accounts;
			accounts = results;
			drawAccounts();
			drawPagination();
		} else {
			$('#no-results').show();
			$('#list').hide();
			$('#pagination').empty();
		}

		location.hash = '';
		page = 1;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	$(window).on('scroll', () => {
		if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300)
			$('#backtotop').show();
		else $('#backtotop').hide();
	});

	$('#backtotop').on('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

	$('.clear-search').on('click', () => {
		$('.search').each( ele => ele.value = '');
		clearSearch();
	});
});